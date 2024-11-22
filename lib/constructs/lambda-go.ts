import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { DD_API_KEY, getCodeAssetsPath } from "./common";
import { Duration, DockerImage } from "aws-cdk-lib";

export interface LambdaGoProps {
  ddhandler?: string;
  service?: string;
  timeout?: Duration;
}
export class LambdaGo extends lambda.Function {
  constructor(scope: Construct, id: string, props: LambdaGoProps) {
    const preConfigs: lambda.FunctionProps = {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      handler: "bootstrap",
      code: lambda.Code.fromAsset(
        getCodeAssetsPath(`golang/${props.ddhandler}`),
        {
          bundling: {
            image: DockerImage.fromRegistry("golang:1.22"),
            command: [
              "bash",
              "-c",
              `GOCACHE=/tmp go mod tidy && GOCACHE=/tmp GOARCH=amd64 GOOS=linux go build -tags lambda.norpc -o /asset-output/bootstrap handler.go`,
            ],
            user: "root",
          },
        }
      ),
      timeout: props.timeout || Duration.seconds(10),
      memorySize: 256,
      environment: {
        DD_API_KEY,
        DD_SERVICE: props.service || "joey-test-step-func",
        DD_SITE: "datadoghq.com",
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
    ];
    this.addLayers(...layers);
  }
}
