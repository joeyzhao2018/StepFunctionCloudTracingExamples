import * as cdk from "aws-cdk-lib";

import * as iam from "aws-cdk-lib/aws-iam";
import { BaseCloudTracingStack } from "./base_cloud_tracing_stack";
import { LambdaJava } from "../constructs/lambda-java";
import { LambdaGo } from "../constructs/lambda-go";
import { LambdaDotnet } from "../constructs/lambda-dotnet";
import { LambdaNodejs } from "../constructs/lambda-nodejs";
import { LambdaPython } from "../constructs/lambda-python";

export class ErrorStack extends BaseCloudTracingStack {
  initializeStepFunction() {
    // // NodeJS case
    // const processorFunction = new LambdaNodejs(this, "errorLambdaNode", {
    //   ddhandler: "error-case.handler",
    //   service: "error-case-node",
    // });

    // Go case
    // const processorFunction = new LambdaGo(this, "errorLambdaGo", {
    //   ddhandler: "error_case",
    //   service: "error-case-go",
    // });

    // Dotnet Case
    // const processorFunction = new LambdaDotnet(this, "error-dotnet-function", {
    //   handler: "DotnetCode::DotnetCode.ErrorCase::FunctionHandler",
    //   service: "error-dotnet-function",
    // });

    // Java case
    // const processorFunction = new LambdaJava(this, "error-java-function", {
    //   handler: "example.ErrorCase",
    //   service: "error-java-function",
    // });

    // python case
    const processorFunction = new LambdaPython(this, "error-python-function", {
      lambdaFileName: "error_case",
      lambdaMethodName: "handler",
      service: "error-python-function",
    });

    const definition = {
      Comment:
        "A state machine that invokes a Lambda function which throws an error",
      StartAt: "InvokeErrorLambda",
      States: {
        InvokeErrorLambda: {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: processorFunction.functionArn,
            "Payload.$": "States.JsonMerge($$, $, false)",
          },
          OutputPath: "$.Payload",
          Catch: [
            {
              ErrorEquals: ["States.ALL"],
              ResultPath: "$.error",
              Next: "HandleError",
            },
          ],
          Next: "SuccessState",
        },
        HandleError: {
          Type: "Pass",
          Parameters: {
            "error.$": "$.Error",
            "cause.$": "$.Cause",
            status: "failed",
          },
          Next: "SuccessState",
        },
        SuccessState: {
          Type: "Pass",
          Parameters: {
            status: "success",
          },
          End: true,
        },
      },
    };

    this.setDefinitionFromJsonObj(definition);

    this.stepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [processorFunction.functionArn],
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
  }
}
