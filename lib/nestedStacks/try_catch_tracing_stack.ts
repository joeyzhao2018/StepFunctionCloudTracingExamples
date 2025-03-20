import {
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  Tags,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { addForwarderToLogGroups } from "datadog-cdk-constructs-v2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { LambdaNodejs } from "../constructs/lambda-nodejs";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";


const MY_ACCOUNT = process.env.MY_ACCOUNT ;

export class TryCatchTracingStack extends NestedStack {
  public logGroup: LogGroup;
  public stepFunction: sfn.StateMachine;
  constructor(scope: Construct, id: string, props: NestedStackProps) {
    super(scope, id, props);

    // Define the Log Group for L2T
    this.logGroup = new LogGroup(this, id + "LogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: "/aws/vendedlogs/states/" + id + "LogGroup",
    });

    const dataBucket = new s3.Bucket(this, "DataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create a Lambda function to process each item
    const processorFunction = new LambdaNodejs(this, "processorFunc", {
      ddhandler: "distmapstate.handler",
      service: "distMapStateStack",
    });
    processorFunction.addEnvironment("BUCKET_NAME", dataBucket.bucketName);

    // Grant the Lambda function permissions to access the S3 bucket
    dataBucket.grantRead(processorFunction);
    dataBucket.grantWrite(processorFunction);

    const errorHandlerFunc = new LambdaNodejs(this, "HandleErrorFunc", {
      ddhandler: "error-handle.handler",
      service: "distMapStateStack",
    });

    const mapState = new sfn.CustomState(this, "DistributedMap", {
      stateJson: {
        Type: "Map",
        ItemProcessor: {
          ProcessorConfig: {
            Mode: "DISTRIBUTED",
            ExecutionType: "STANDARD",
          },
          StartAt: "ProcessItem",
          States: {
            ProcessItem: {
              Type: "Task",
              Resource: "arn:aws:states:::lambda:invoke",
              Parameters: {
                FunctionName: processorFunction.functionArn,
                "Payload.$": "States.JsonMerge($$, $, false)",
              },
              ResultPath: "$.processingResult",
              End: true,
            },
          },
        },
        MaxConcurrency: 1000,
        ToleratedFailurePercentage: 5,
        ItemReader: {
          ReaderConfig: {
            InputType: "JSON",
            MaxItems: 100,
          },
          Resource: "arn:aws:states:::s3:getObject",
          Parameters: {
            Bucket: dataBucket.bucketName,
            Key: "input.json",
          },
        },
        ResultWriter: {
          Resource: "arn:aws:states:::s3:putObject",
          Parameters: {
            Bucket: dataBucket.bucketName,
            Prefix: "output/",
          },
        },
        Retry: [
          {
            ErrorEquals: ["States.TaskFailed"],
            IntervalSeconds: 1,
            MaxAttempts: 2,
            BackoffRate: 1.0,
          },
        ],
      },
    });
    const successState = new sfn.Succeed(this, "ProcessingSucceeded");
    const errorHandler = new tasks.LambdaInvoke(this, "HandleError", {
      lambdaFunction: errorHandlerFunc,
      resultPath: "$.errorInfo",
    });
    const theIamRole = new iam.Role(this, "StateMachineRole", {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
    });
    theIamRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [dataBucket.bucketArn],
      })
    );

    this.stepFunction = new sfn.StateMachine(this, "DistributedMapWorkflow", {
      definition: sfn.Chain.start(
        mapState.addCatch(errorHandler, {
          resultPath: "$.error",
        })
      ).next(successState),
      timeout: cdk.Duration.minutes(10),
      role: theIamRole,
      logs: {
        // also part of enabling cloud tracing
        destination: this.logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
    theIamRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["states:StartExecution"],
        resources: ["*"],
      })
    );
    processorFunction.grantInvoke(this.stepFunction);
    errorHandlerFunc.grantInvoke(this.stepFunction);

    this.enableCloudTracing(id);
  }

  setDefinitionFromJsonObj(definition: object) {
    const cfnStateMachine = this.stepFunction.node
      .defaultChild as sfn.CfnStateMachine;
    cfnStateMachine.definitionString = JSON.stringify(definition);
  }

  setDefinitionFromChainable(definition: sfn.IChainable) {
    // Actually this doesn't work now....
    const cfnStateMachine = this.stepFunction.node
      .defaultChild as sfn.CfnStateMachine;
    cfnStateMachine.definition = definition;
  }

  enableCloudTracing(id: string) {
    Tags.of(this.stepFunction).add("service", id);
    Tags.of(this.stepFunction).add("env", id); // just to make my search easier.
    Tags.of(this.stepFunction).add("DD_TRACE_ENABLED", "true");
    Tags.of(this.stepFunction).add("version", "1");

    const forwarderARN = `arn:aws:lambda:ca-central-1:${MY_ACCOUNT}:function:DatadogForwarder-ddserverless`; // To Prod
    addForwarderToLogGroups(this, [this.logGroup], forwarderARN, true);
    const forwarderARNStaging = `arn:aws:lambda:ca-central-1:${MY_ACCOUNT}:function:DatadogForwarder-Staging`; // To staging
    addForwarderToLogGroups(this, [this.logGroup], forwarderARNStaging, true);
  }
}
