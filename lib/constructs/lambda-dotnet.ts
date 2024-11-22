import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { DD_API_KEY, getCodeAssetsPath } from "./common";
import { Duration } from "aws-cdk-lib";

export interface LambdaDotnetProps {
  handler: string;
  service?: string;
  timeout?: Duration;
}
export class LambdaDotnet extends lambda.Function {
  constructor(scope: Construct, id: string, props: LambdaDotnetProps) {
    const preConfigs: lambda.FunctionProps = {
      runtime: lambda.Runtime.DOTNET_8,
      handler: props.handler,
      code: lambda.Code.fromAsset(getCodeAssetsPath("dotnet"), {
        bundling: {
          image: lambda.Runtime.DOTNET_8.bundlingImage,
          command: [
            "bash",
            "-c",
            "mkdir -p /tmp/obj && cp -r . /tmp && cd /tmp && dotnet publish --output /asset-output --configuration Release --framework net8.0 --self-contained False /p:GenerateRuntimeConfigurationFiles=true -r linux-x64",
          ],
          user: "root",
          volumes: [
            {
              hostPath: "/tmp",
              containerPath: "/tmp",
            },
          ],
        },
      }),
      timeout: props.timeout || Duration.seconds(10),
      memorySize: 1024,
      environment: {
        DD_API_KEY,
        DD_SERVICE: props.service || "joey-test-step-func",
        DD_SITE: "datadoghq.com",
        AWS_LAMBDA_EXEC_WRAPPER: "/opt/datadog_wrapper",
        DD_TRACE_ENABLED: "true",
        DD_TRACE_MANAGED_SERVICES: "true",
        DD_COLD_START_TRACING: "false",
        DD_ENV: "joey-test-step-func",
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
        "arn:aws:lambda:ca-central-1:464622532012:layer:dd-trace-dotnet:16"
      ),
    ];
    this.addLayers(...layers);
  }
}
