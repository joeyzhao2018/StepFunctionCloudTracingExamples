import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { DD_API_KEY, getCodeAssetsPath } from "./common";
import { Duration } from "aws-cdk-lib";
import {
  PythonFunction,
  PythonFunctionProps,
} from "@aws-cdk/aws-lambda-python-alpha";
export interface LambdaPythonProps {
  lambdaFileName: string; // without .py
  lambdaMethodName: string;
  service?: string;
  timeout?: Duration;
  ddTracing?: boolean;
  xrayTracing?: lambda.Tracing;
}

// We are extending PythonFunction from @aws-cdk/aws-lambda-python-alpha here
// because it help simplify the dependency packaging.
// See more in code - assests/python/README.md

export class LambdaPython extends PythonFunction {
  constructor(scope: Construct, id: string, props: LambdaPythonProps) {
    const preConfigs: PythonFunctionProps = {
      runtime: lambda.Runtime.PYTHON_3_9,
      // handler: "datadog_lambda.handler.handler", // The layer will add this
      entry: getCodeAssetsPath("python"),
      index: props.lambdaFileName + ".py",
      environment: {
        DD_API_KEY,
        DD_SERVICE: props.service || id,
        DD_SITE: "datadoghq.com",
        DD_TRACE_ENABLED: props.ddTracing ? props.ddTracing.toString() : "true",
        DD_LAMBDA_HANDLER: props.lambdaFileName + "." + props.lambdaMethodName,
        DD_TRACE_MANAGED_SERVICES: "true",
        DD_COLD_START_TRACING: "false",
        DD_ENV: id,
      },
      timeout: props.timeout || Duration.seconds(30),
      tracing: props.xrayTracing || lambda.Tracing.DISABLED,
      memorySize: 256,
    };

    // Customized Props Overriding Pre-Configured Props
    const merged_props = {
      ...preConfigs,
      ...props,
    };
    super(scope, id, merged_props);
    const layers = [
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        "extension",
        "arn:aws:lambda:us-west-2:464622532012:layer:Datadog-Extension:65"
      ),
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        "layer",
        "arn:aws:lambda:us-west-2:464622532012:layer:Datadog-Python39:99"
      ),
    ];
    this.addLayers(...layers);
    const cfnFunction = this.node.defaultChild as lambda.CfnFunction;
    cfnFunction.handler = "datadog_lambda.handler.handler";
  }
}
