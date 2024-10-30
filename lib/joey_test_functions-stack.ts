import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as httpapi from "@aws-cdk/aws-apigatewayv2-alpha";
import * as httpIntegrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Construct } from "constructs";
import { LambdaNodejs } from "./constructs/lambda-nodejs";

export class JoeyTestFunctionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Lambda function for REST API
    const restLambda = new LambdaNodejs(this, "RestApiHandler", {
      ddhandler: "index.resthandler",
      service: "testing_rest_api",
    });

    // REST API Gateway
    const restApi = new apigateway.RestApi(this, "RestApi", {
      restApiName: "Test Rest API Service",
      description: "This is a REST API service.",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // REST API Integration
    const restIntegration = new apigateway.LambdaIntegration(restLambda);
    restApi.root.addMethod("GET", restIntegration);
    restApi.root.addMethod("POST", restIntegration);

    // Lambda function for HTTP API
    const httpLambda = new LambdaNodejs(this, "HttpApiHandler", {
      ddhandler: "index.httphandler",
      service: "testing_http_api",
    });

    // HTTP API Gateway
    const httpApi = new httpapi.HttpApi(this, "HttpApi", {
      apiName: "Test Http API Service",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [httpapi.CorsHttpMethod.ANY],
      },
    });

    // HTTP API Integration
    const httpIntegration = new httpIntegrations.HttpLambdaIntegration(
      "HttpApiIntegration",
      httpLambda
    );

    httpApi.addRoutes({
      path: "/",
      methods: [httpapi.HttpMethod.GET, httpapi.HttpMethod.POST],
      integration: httpIntegration,
    });

    // Output the API URLs
    new cdk.CfnOutput(this, "RestApiUrl", {
      value: restApi.url ?? "undefined",
      description: "REST API URL",
    });

    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.url ?? "undefined",
      description: "HTTP API URL",
    });
  }
}
