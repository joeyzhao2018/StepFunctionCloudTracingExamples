import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RetryNestedStack } from "./retry_stack";
import { LoopBackNestedStack } from "./loop_back_stack";
import { SqsRelatedStack } from "./sqs_related_stack";

export class JoeyTestStepFunctionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const retryStack = new RetryNestedStack(this, "retryExample", {});
    const loopBackStack = new LoopBackNestedStack(this, "LoopBackExample", {});
    const sqsRelatedStack = new SqsRelatedStack(this, "SqsRelatedStack", {});
  }
}
