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

export class RetryNestedStack extends NestedStack {
  public logGroup: LogGroup;

  constructor(scope: Construct, props: NestedStackProps) {
    super(scope, "retryExample", props);
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
    // Define the Log Group for L2T
    this.logGroup = new LogGroup(this, "RetryStateMachineLogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: "/aws/vendedlogs/states/RetryStateMachineLogGroup",
    });
    // Define the Step Function

    const stepFunction = new sfn.StateMachine(this, "StateMachine", {
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

    Tags.of(stepFunction).add("service", "joey-test-step-functions");
    Tags.of(stepFunction).add("env", "joey");
    Tags.of(stepFunction).add("DD_TRACE_ENABLED", "true");
    Tags.of(stepFunction).add("version", "1");
  }
}
