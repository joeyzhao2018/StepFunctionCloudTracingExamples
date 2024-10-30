import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";
import { BaseCloudTracingStack } from "./base_cloud_tracing_stack";
import { LambdaNodejs } from "../constructs/lambda-nodejs";

export class DistributedMapStateStack extends BaseCloudTracingStack {
  initializeStepFunction() {
    // Create an S3 bucket for input/output
    const dataBucket = new s3.Bucket(this, "DataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create a Lambda function to process each item
    const processorFunction = new LambdaNodejs(this, "processorFunc", {
      ddhandler: "distmapstate.handler",
      service: "distMapStateStack",
    });

    // Grant the Lambda function permissions to access the S3 bucket
    dataBucket.grantRead(processorFunction);
    dataBucket.grantWrite(processorFunction);

    // Create the Lambda task for processing individual items
    const processItem = new tasks.LambdaInvoke(this, "ProcessItem", {
      lambdaFunction: processorFunction,
      resultPath: "$.processingResult",
      payload: sfn.TaskInput.fromObject({
        "Payload.$": "States.JsonMerge($$, $, false)",
      }),
    });

    // Create the Map state definition
    const mapStateDefinition = new sfn.Map(this, "MapState", {
      maxConcurrency: 100,
      itemsPath: sfn.JsonPath.stringAt("$"),
      itemSelector: {
        "item.$": "$$.Map.Item.Value",
      },
    });

    // Add the Lambda task to the map state
    mapStateDefinition.itemProcessor(processItem);

    // Create the distributed map state definition
    const distributedMapDefinition = {
      StartAt: "MapState",
      States: {
        MapState: {
          Type: "Map",
          MaxConcurrency: 100,
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
          End: true,
        },
      },
    };

    // Update the state machine definition
    // Get the underlying CfnStateMachine to configure distributed map properties
    this.setDefinitionFromJsonObj(distributedMapDefinition);

    // Grant necessary permissions
    dataBucket.grantRead(this.stepFunction);
    dataBucket.grantWrite(this.stepFunction);

    this.stepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [processorFunction.functionArn],
      })
    );

    // Add required permissions for distributed map processing
    this.stepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:ListBucket", "s3:PutObject"],
        resources: [dataBucket.bucketArn, `${dataBucket.bucketArn}/*`],
      })
    );

    this.stepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "states:StartExecution",
          "states:DescribeExecution",
          "states:StopExecution",
        ],
        resources: ["*"], // if use stateMachine.stateMachineArn then it's circular dependency
      })
    );

    // Output the important resources
    new cdk.CfnOutput(this, "StateMachineARN", {
      value: this.stepFunction.stateMachineArn,
      description: "The ARN of the State Machine",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: dataBucket.bucketName,
      description: "The name of the S3 bucket",
    });
  }
}
