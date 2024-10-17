import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RetryNestedStack } from "./retry_stack";
import { LoopBackNestedStack } from "./loop_back_stack";
import { addForwarderToLogGroups } from "datadog-cdk-constructs-v2";
import { SqsRelatedStack } from "./sqs_related_stack";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

const MY_ACCOUNT = "";
export class JoeyTestStepFunctionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const retryStack = new RetryNestedStack(this, {});
    const loopBackStack = new LoopBackNestedStack(this, {});

    const sqsRelatedStack = new SqsRelatedStack(this, {});
    this.enableCloudTracing(
      sqsRelatedStack.stateMachine,
      "SqsRelatedStackLogGroup"
    );

    const forwarderARN = `arn:aws:lambda:us-west-2:${MY_ACCOUNT}:function:joey-datadog-forwarder-Forwarder-Eexdd3oFeRfR`; // To Prod

    addForwarderToLogGroups(
      this,
      [retryStack.logGroup, loopBackStack.logGroup],
      forwarderARN,
      true
    );

    const forwarderARNStaging = `arn:aws:lambda:us-west-2:${MY_ACCOUNT}:function:joey-staging-datadog-forwarder-Forwarder-sYy45ZxYr6dN`; // To staging
    addForwarderToLogGroups(
      this,
      [retryStack.logGroup, loopBackStack.logGroup],
      forwarderARNStaging,
      true
    );
  }

  enableCloudTracing(stateMachine: sfn.StateMachine, logGroupName: string) {
    // You need to have a forwarder in order to enable cloud tracing
    // here I have 2, one for prod and one for staging
    const forwarderARN = `arn:aws:lambda:us-west-2:${MY_ACCOUNT}:function:joey-datadog-forwarder-Forwarder-Eexdd3oFeRfR`; // To Prod
    const forwarderARNStaging = `arn:aws:lambda:us-west-2:${MY_ACCOUNT}:function:joey-staging-datadog-forwarder-Forwarder-sYy45ZxYr6dN`; // To staging

    // Create a log group
    const logGroup = new LogGroup(this, logGroupName, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: "/aws/vendedlogs/states/" + logGroupName,
    });
    // Let the state machine write logs to the log group
    logGroup.grantWrite(stateMachine);
    // let the forwarder forward logs from the log group
    addForwarderToLogGroups(this, [logGroup], forwarderARN, true); // For prod
    addForwarderToLogGroups(this, [logGroup], forwarderARNStaging, true); // For staging
  }
}
