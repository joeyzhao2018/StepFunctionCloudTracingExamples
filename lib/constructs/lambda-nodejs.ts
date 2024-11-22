import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { DD_API_KEY, getCodeAssetsPath } from "./common";
import { Duration } from "aws-cdk-lib";

export interface LambdaNodejsProps {
  ddhandler: string;
  service?: string;
  timeout?: Duration;
}
export class LambdaNodejs extends lambda.Function {
  constructor(scope: Construct, id: string, props: LambdaNodejsProps) {
    const preConfigs: lambda.FunctionProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "/opt/nodejs/node_modules/datadog-lambda-js/handler.handler", // The layer will add this
      code: lambda.Code.fromAsset(getCodeAssetsPath("nodejs")),
      timeout: Duration.seconds(300),
      memorySize: 256,
      environment: {
        DD_API_KEY,
        DD_SERVICE: props.service || "lambda-nodejs-integ-test",
        DD_SITE: "datadoghq.com",
        DD_TRACE_ENABLED: "true",
        DD_LAMBDA_HANDLER: props.ddhandler,
        DD_TRACE_MANAGED_SERVICES: "true",
        DD_COLD_START_TRACING: "false",
        DD_ENV: "dev",
        DD_LOG_LEVEL: "debug",
        DD_CAPTURE_LAMBDA_PAYLOAD: "true",
      },
    };

    const merged_props = {
      ...preConfigs,
      ...props,
    };
    super(scope, id, merged_props);

    const layers = [
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        "extension",
        "arn:aws:lambda:ca-central-1:464622532012:layer:Datadog-Extension:65"
      ),
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        "layer",
        "arn:aws:lambda:ca-central-1:464622532012:layer:Datadog-Node18-x:115"
      ),
    ];
    this.addLayers(...layers);
  }
}
