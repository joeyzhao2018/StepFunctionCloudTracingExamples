import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export class SqsRelatedStack extends cdk.NestedStack {
  public stateMachine: sfn.StateMachine;

  constructor(scope: Construct, props?: cdk.NestedStackProps) {
    super(scope, "SqsRelatedStack", props);

    // Create an SQS queue
    const queue = new sqs.Queue(this, "MyQueue", {
      queueName: "step-function-target-queue",
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create the Step Function definition
    const sendToSqsTask = new tasks.SqsSendMessage(this, "SendToSQS", {
      queue: queue,
      messageBody: sfn.TaskInput.fromObject({
        MessageId: sfn.JsonPath.stringAt("$.messageId"),
        Payload: sfn.JsonPath.stringAt("$.payload"),
        Timestamp: sfn.JsonPath.stringAt("$$.Execution.StartTime"),
      }),
      resultPath: "$.sqsResult",
    });

    sendToSqsTask.addRetry({
      maxAttempts: 3, // Retry up to X Times
      interval: cdk.Duration.seconds(12), // Wait X seconds between retries
      backoffRate: 2, // X the wait time for each retry
      errors: ["States.TaskFailed"],
    });

    // Create the state machine
    this.stateMachine = new sfn.StateMachine(this, "StateMachine", {
      definition: sendToSqsTask,
      stateMachineName: "SQSMessageSender",
      timeout: cdk.Duration.minutes(5),
      tracingEnabled: true, // Enable X-Ray tracing
      comment: "State machine that sends messages to SQS",
    });

    // Grant the state machine permission to send messages to the queue
    queue.grantSendMessages(this.stateMachine);

    // Output the ARNs for reference
    new cdk.CfnOutput(this, "StateMachineArn", {
      value: this.stateMachine.stateMachineArn,
      description: "State Machine ARN",
    });

    new cdk.CfnOutput(this, "QueueUrl", {
      value: queue.queueUrl,
      description: "SQS Queue URL",
    });

    new cdk.CfnOutput(this, "QueueArn", {
      value: queue.queueArn,
      description: "SQS Queue ARN",
    });
  }
}
