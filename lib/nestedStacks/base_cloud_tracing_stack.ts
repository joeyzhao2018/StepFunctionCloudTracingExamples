import {
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  Tags,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";

import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { addForwarderToLogGroups } from "datadog-cdk-constructs-v2";

const MY_ACCOUNT = "";

export abstract class BaseCloudTracingStack extends NestedStack {
  public logGroup: LogGroup;
  public stepFunction: sfn.StateMachine;
  abstract initializeStepFunction(): void; // Abstract method: you need to create this.stepFunction in the derived class
  constructor(scope: Construct, id: string, props: NestedStackProps) {
    super(scope, id, props);

    // Define the Log Group for L2T
    this.logGroup = new LogGroup(this, id + "LogGroup", {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: "/aws/vendedlogs/states/" + id + "LogGroup",
    });

    this.stepFunction = new sfn.StateMachine(this, id + "StateMachine", {
      definition: sfn.Chain.start(new sfn.Pass(this, "StartState")), // dummy state to be replaced
      timeout: Duration.minutes(10),
      logs: {
        // also part of enabling cloud tracing
        destination: this.logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });
    this.initializeStepFunction();
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

    const forwarderARN = `arn:aws:lambda:us-west-2:${MY_ACCOUNT}:function:joey-datadog-forwarder-Forwarder-Eexdd3oFeRfR`; // To Prod
    addForwarderToLogGroups(this, [this.logGroup], forwarderARN, true);
    const forwarderARNStaging = `arn:aws:lambda:us-west-2:${MY_ACCOUNT}:function:joey-staging-datadog-forwarder-Forwarder-sYy45ZxYr6dN`; // To staging
    addForwarderToLogGroups(this, [this.logGroup], forwarderARNStaging, true);
  }
}
