import { LambdaPython } from "../constructs/lambda-python";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { BaseCloudTracingStack } from "./base_cloud_tracing_stack";

export class StepLambdaLambdaStack extends BaseCloudTracingStack {
  initializeStepFunction() {
    const invokerlambda = new LambdaPython(this, "invoker", {
      lambdaFileName: "invoker",
      lambdaMethodName: "invoke",
      service: "step-lambda-lambda",
    });
    const targetlambda = new LambdaPython(this, "target", {
      lambdaFileName: "invoker",
      lambdaMethodName: "dummy",
      service: "step-lambda-lambda",
    });
    invokerlambda.addEnvironment("TARGET_FUNCTION", targetlambda.functionName);
    targetlambda.grantInvoke(invokerlambda);
    invokerlambda.grantInvoke(this.stepFunction);

    const definition = {
      StartAt: "InvokeFirstLambda",
      States: {
        InvokeFirstLambda: {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: invokerlambda.functionArn,
            "Payload.$": "States.JsonMerge($$, $, false)",
          },
          ResultPath: "$",
          End: true,
        },
      },
    };

    this.setDefinitionFromJsonObj(definition);
  }
}
