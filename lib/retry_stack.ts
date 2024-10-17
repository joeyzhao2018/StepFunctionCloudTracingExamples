import { Duration } from "aws-cdk-lib";
import { LambdaNodejs } from "./constructs/lambda-nodejs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { BaseCloudTracingStack } from "./base_cloud_tracing_stack";

export class RetryNestedStack extends BaseCloudTracingStack {
  initializeStepFunction() {
    const retryLambda1 = new LambdaNodejs(this, "retryLambda1", {
      ddhandler: "retry.handler",
      service: "joey-test-step-1",
    });
    const lambdaTask1 = new tasks.LambdaInvoke(this, "Task1", {
      lambdaFunction: retryLambda1,
      outputPath: "$.Payload", // Use the Lambda function's output as the next state's input
    });

    // Add retry logic to the Lambda task
    lambdaTask1.addRetry({
      maxAttempts: 5, // Retry up to X Times
      interval: Duration.seconds(0), // Wait X seconds between retries
      backoffRate: 1.2, // X the wait time for each retry
      errors: [
        "States.TaskFailed",
        // "Lambda.ServiceException",
        // "Lambda.AWSLambdaException",
        // "Lambda.SdkClientException",
      ],
    });

    const retryLambda2 = new LambdaNodejs(this, "retryLambda2", {
      ddhandler: "retry.handler",
      service: "joey-test-step-2",
    });
    retryLambda2.addEnvironment("FAILURE_RATE", "0.0");
    const lambdaTask2 = new tasks.LambdaInvoke(this, "Task2", {
      lambdaFunction: retryLambda2,
      outputPath: "$.Payload", // Use the Lambda function's output as the next state's input
    });

    // Add retry logic to the Lambda task
    lambdaTask2.addRetry({
      maxAttempts: 5, // Retry up to X times
      interval: Duration.seconds(0), // Wait X seconds between retries
      backoffRate: 1.2, // X the wait time for each retry
      errors: [
        "States.TaskFailed",
        // "Lambda.ServiceException",
        // "Lambda.AWSLambdaException",
        // "Lambda.SdkClientException",
      ],
    });

    // Define the Step Function

    this.stepFunction = new sfn.StateMachine(this, "StateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(
        lambdaTask1.next(lambdaTask2)
      ),
      timeout: Duration.minutes(10),
      logs: {
        destination: this.logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
  }
}
