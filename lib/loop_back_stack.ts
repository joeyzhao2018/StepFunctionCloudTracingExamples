import { Duration } from "aws-cdk-lib";
import { LambdaNodejs } from "./constructs/lambda-nodejs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { BaseCloudTracingStack } from "./base_cloud_tracing_stack";

export class LoopBackNestedStack extends BaseCloudTracingStack {
  initializeStepFunction() {
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

    // Define the Step Function
    this.stepFunction = new sfn.StateMachine(this, "StateMachine", {
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
  }
}
