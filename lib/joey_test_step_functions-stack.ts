import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RetryNestedStack } from "./nestedStacks/retry_stack";
import { LoopBackNestedStack } from "./nestedStacks/loop_back_stack";
import { SqsRelatedStack } from "./nestedStacks/sqs_related_stack";

import { DistributedMapStateStack } from "./nestedStacks/distributed_mapstate_stack";
import { StepLambdaLambdaStack } from "./nestedStacks/step_lambda_lambda_stack";
export class JoeyTestStepFunctionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const retryStack = new RetryNestedStack(this, "retryExample", {});
    // const loopBackStack = new LoopBackNestedStack(this, "LoopBackExample", {});
    // const sqsRelatedStack = new SqsRelatedStack(this, "SqsRelatedStack", {});
    const distributedMapStateStack = new DistributedMapStateStack(
      this,
      "distMapStateStack",
      {}
    );
    const stepLambdaLambdaStack = new StepLambdaLambdaStack(
      this,
      "stepLambdaLambdaStack",
      {}
    );

    cdk.Tags.of(distributedMapStateStack).add("DD_PRESERVE_STACK", "true");
    cdk.Tags.of(stepLambdaLambdaStack).add("DD_PRESERVE_STACK", "true");
  }
}
