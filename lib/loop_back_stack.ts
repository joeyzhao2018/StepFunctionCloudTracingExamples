import {
  NestedStack,
  NestedStackProps,
  Duration,
  RemovalPolicy,
  Tags,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaNodejs } from "./constructs/lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";

export class LoopBackNestedStack extends NestedStack {
  public logGroup: LogGroup;

  constructor(scope: Construct, props: NestedStackProps) {
    super(scope, "LoopBackExample", props);
    const looplambda = new LambdaNodejs(this, "looplambda", {
      ddhandler: "loop.handler",
      service: "joey-test-loop-back",
    });
    const lambdaLoopTask = new tasks.LambdaInvoke(this, "LoopTask", {
      lambdaFunction: looplambda,
      resultPath: "$.result", // Use the Lambda function's output as the next state's input
    });

    // Define the Choice state
    const checkCondition = new sfn.Choice(this, "Check Condition")
      .when(
        sfn.Condition.stringEquals("$.result.Payload.continue", "Y"),
        lambdaLoopTask
      )
      .otherwise(new sfn.Succeed(this, "End State"));
    // Define the Log Group for L2T
    this.logGroup = new LogGroup(this, "LoopBackStateMachineLogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: "/aws/vendedlogs/states/LoopBackStateMachineLogGroup",
    });
    // Define the Step Function

    const stepFunction = new sfn.StateMachine(this, "StateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(
        lambdaLoopTask.next(checkCondition)
      ),
      timeout: Duration.minutes(5),
      logs: {
        destination: this.logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
    Tags.of(stepFunction).add("service", "joey-test-loop-back");
    Tags.of(stepFunction).add("env", "joeyloop");
    Tags.of(stepFunction).add("DD_TRACE_ENABLED", "true");
    Tags.of(stepFunction).add("version", "1");
  }
}
