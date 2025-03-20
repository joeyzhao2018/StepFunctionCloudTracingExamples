import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as iam from "aws-cdk-lib/aws-iam";
import { BaseCloudTracingStack } from "./base_cloud_tracing_stack";
import { LambdaNodejs } from "../constructs/lambda-nodejs";
// import { addForwarderToLogGroups } from "datadog-cdk-constructs-v2";
// import { nextTick } from "process";
import {
  NestedStack,
  NestedStackProps,
  RemovalPolicy,
  Tags,
  Duration,
} from "aws-cdk-lib";
export class DistributedMapStateStack extends BaseCloudTracingStack {
  initializeStepFunction() {
    // Create an S3 bucket for input/output
    const dataBucket = new s3.Bucket(this, "DataBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create a Lambda function to process each item
    const processorFunction = new LambdaNodejs(this, "processorFunc", {
      ddhandler: "distmapstate.handler",
      service: "distMapStateStack",
    });
    processorFunction.addEnvironment("BUCKET_NAME", dataBucket.bucketName);

    // Grant the Lambda function permissions to access the S3 bucket
    dataBucket.grantRead(processorFunction);
    dataBucket.grantWrite(processorFunction);

    const simple_distributedMapDefinition = {
      StartAt: "MyMapState",
      States: {
        MyMapState: {
          Type: "Map",
          MaxConcurrency: 100,
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD",
            },
            StartAt: "ProcessItem",
            // QueryLanguage: "JSONata",
            States: {
              ProcessItem: {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  FunctionName: processorFunction.functionArn,
                  "Payload.$": "States.JsonMerge($$, $, false)",
                },

                ResultPath: "$.processingResult",
                End: true,
                Retry: [
                  {
                    ErrorEquals: ["States.ALL"],
                    BackoffRate: 2,
                    IntervalSeconds: 1,
                    MaxAttempts: 1,
                  },
                ],
              },
            },
          },
          ItemReader: {
            ReaderConfig: {
              InputType: "JSON",
              MaxItems: 100,
            },
            Resource: "arn:aws:states:::s3:getObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Key: "input.json",
            },
          },
          ResultWriter: {
            Resource: "arn:aws:states:::s3:putObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Prefix: "output/",
            },
          },
          Retry: [
            {
              ErrorEquals: ["States.TaskFailed"],
              IntervalSeconds: 1,
              MaxAttempts: 2,
              BackoffRate: 1.0,
            },
          ],
          End: true,
        },
      },
    };
    // Create the distributed map state definition
    const nested_distributedMapDefinition = {
      StartAt: "MapState",
      States: {
        MapState: {
          Type: "Map",
          MaxConcurrency: 100,
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD",
            },
            StartAt: "ProcessItem",
            // QueryLanguage: "JSONata",
            States: {
              ProcessItem: {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  FunctionName: processorFunction.functionArn,
                  "Payload.$": "States.JsonMerge($$, $, false)",
                },
                // Arguments: {
                //   FunctionName: processorFunction.functionArn,
                //   Payload:
                //     "{% ($execInput := $states.context.Execution.Input; $ddContext := $exists($execInput._datadog) ? $execInput._datadog : {'x-datadog-execution-arn': $states.context.Execution.Id}; $merge([{'_datadog': $ddContext}, $execInput, $states.context])) %}",
                // },
                ResultPath: "$.processingResult",
                // End: true,
                Next: "SecondMap",
              },
              SecondMap: {
                Type: "Map",
                MaxConcurrency: 100,
                ItemProcessor: {
                  ProcessorConfig: {
                    Mode: "DISTRIBUTED",
                    ExecutionType: "STANDARD",
                  },
                  StartAt: "ProcessSecondItem",
                  States: {
                    ProcessSecondItem: {
                      Type: "Task",
                      Resource: "arn:aws:states:::lambda:invoke",
                      Parameters: {
                        FunctionName: processorFunction.functionArn,
                        "Payload.$": "States.JsonMerge($$, $, false)",
                      },
                      ResultPath: "$.processingResult",
                      End: true,
                    },
                  },
                },
                ItemReader: {
                  ReaderConfig: {
                    InputType: "JSON",
                    MaxItems: 100,
                  },
                  Resource: "arn:aws:states:::s3:getObject",
                  Parameters: {
                    Bucket: dataBucket.bucketName,
                    Key: "input2.json",
                    // "Key.$": "States.Format('output/{}/manifest.json', $$.Execution.Id)",
                  },
                },
                ResultWriter: {
                  Resource: "arn:aws:states:::s3:putObject",
                  Parameters: {
                    Bucket: dataBucket.bucketName,
                    Prefix: "final-output/",
                  },
                },
                End: true,
              },
            },
          },

          ItemReader: {
            ReaderConfig: {
              InputType: "JSON",
              MaxItems: 100,
            },
            Resource: "arn:aws:states:::s3:getObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Key: "input.json",
            },
          },
          ResultWriter: {
            Resource: "arn:aws:states:::s3:putObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Prefix: "output/",
            },
          },
          End: true,
        },
      },
    };

    const sequential_distributedMapDefinition = {
      StartAt: "FirstMapState",
      States: {
        FirstMapState: {
          Type: "Map",
          MaxConcurrency: 100,
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD",
            },
            StartAt: "ProcessItem",
            // QueryLanguage: "JSONata",
            States: {
              ProcessItem: {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  FunctionName: processorFunction.functionArn,
                  "Payload.$": "States.JsonMerge($$, $, false)",
                },

                ResultPath: "$.processingResult",
                End: true,
              },
            },
          },
          ItemReader: {
            ReaderConfig: {
              InputType: "JSON",
              MaxItems: 100,
            },
            Resource: "arn:aws:states:::s3:getObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Key: "input.json",
            },
          },
          ResultWriter: {
            Resource: "arn:aws:states:::s3:putObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Prefix: "output/",
            },
          },
          Retry: [
            {
              ErrorEquals: ["States.TaskFailed"],
              IntervalSeconds: 1,
              MaxAttempts: 2,
              BackoffRate: 1.0,
            },
          ],
          Next: "SecondMapState",
        },
        SecondMapState: {
          Type: "Map",
          MaxConcurrency: 100,
          ItemProcessor: {
            ProcessorConfig: {
              Mode: "DISTRIBUTED",
              ExecutionType: "STANDARD",
            },
            StartAt: "ProcessSecondItem",
            States: {
              ProcessSecondItem: {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  FunctionName: processorFunction.functionArn,
                  "Payload.$": "States.JsonMerge($$, $, false)",
                },
                ResultPath: "$.processingResult",
                End: true,
              },
            },
          },
          ItemReader: {
            ReaderConfig: {
              InputType: "JSON",
              MaxItems: 100,
            },
            Resource: "arn:aws:states:::s3:getObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Key: "input2.json",
              // "Key.$": "States.Format('output/{}/manifest.json', $$.Execution.Id)",
            },
          },
          ResultWriter: {
            Resource: "arn:aws:states:::s3:putObject",
            Parameters: {
              Bucket: dataBucket.bucketName,
              Prefix: "final-output/",
            },
          },
          End: true,
        },
      },
    };

    const parallel_distributedMapDefinition = {
      StartAt: "ParallelMaps",
      States: {
        ParallelMaps: {
          Type: "Parallel",
          Branches: [
            {
              StartAt: "FirstMapState",
              States: {
                FirstMapState: {
                  Type: "Map",
                  MaxConcurrency: 100,
                  ItemProcessor: {
                    ProcessorConfig: {
                      Mode: "DISTRIBUTED",
                      ExecutionType: "STANDARD",
                    },
                    StartAt: "ProcessItem",
                    States: {
                      ProcessItem: {
                        Type: "Task",
                        Resource: "arn:aws:states:::lambda:invoke",
                        Parameters: {
                          FunctionName: processorFunction.functionArn,
                          "Payload.$": "States.JsonMerge($$, $, false)",
                        },
                        ResultPath: "$.processingResult",
                        End: true,
                      },
                    },
                  },
                  ItemReader: {
                    ReaderConfig: {
                      InputType: "JSON",
                      MaxItems: 100,
                    },
                    Resource: "arn:aws:states:::s3:getObject",
                    Parameters: {
                      Bucket: dataBucket.bucketName,
                      Key: "input.json",
                    },
                  },
                  ResultWriter: {
                    Resource: "arn:aws:states:::s3:putObject",
                    Parameters: {
                      Bucket: dataBucket.bucketName,
                      Prefix: "output/",
                    },
                  },
                  Retry: [
                    {
                      ErrorEquals: ["States.TaskFailed"],
                      IntervalSeconds: 1,
                      MaxAttempts: 2,
                      BackoffRate: 1.0,
                    },
                  ],
                  End: true,
                },
              },
            },
            {
              StartAt: "SecondMapState",
              States: {
                SecondMapState: {
                  Type: "Map",
                  MaxConcurrency: 100,
                  ItemProcessor: {
                    ProcessorConfig: {
                      Mode: "DISTRIBUTED",
                      ExecutionType: "STANDARD",
                    },
                    StartAt: "ProcessSecondItem",
                    States: {
                      ProcessSecondItem: {
                        Type: "Task",
                        Resource: "arn:aws:states:::lambda:invoke",
                        Parameters: {
                          FunctionName: processorFunction.functionArn,
                          "Payload.$": "States.JsonMerge($$, $, false)",
                        },
                        ResultPath: "$.processingResult",
                        End: true,
                      },
                    },
                  },
                  ItemReader: {
                    ReaderConfig: {
                      InputType: "JSON",
                      MaxItems: 100,
                    },
                    Resource: "arn:aws:states:::s3:getObject",
                    Parameters: {
                      Bucket: dataBucket.bucketName,
                      Key: "input2.json",
                    },
                  },
                  ResultWriter: {
                    Resource: "arn:aws:states:::s3:putObject",
                    Parameters: {
                      Bucket: dataBucket.bucketName,
                      Prefix: "final-output/",
                    },
                  },
                  End: true,
                },
              },
            },
          ],
          End: true,
        },
      },
    };
    // Update the state machine definition
    // Get the underlying CfnStateMachine to configure distributed map properties
    this.setDefinitionFromJsonObj(simple_distributedMapDefinition);

    // Grant necessary permissions
    dataBucket.grantRead(this.stepFunction);
    dataBucket.grantWrite(this.stepFunction);

    this.stepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [processorFunction.functionArn],
      })
    );

    // Add required permissions for distributed map processing
    this.stepFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:ListBucket", "s3:PutObject"],
        resources: [dataBucket.bucketArn, `${dataBucket.bucketArn}/*`],
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

    const initialState = new sfn.Pass(this, "InitialState", {
      // parameters: {
      //   "input.$": "$.input",
      // },
      // resultPath: "$.parentInput",
    });

    const invokeChildState = new sfn.CustomState(
      this,
      "InvokeDownstreamStateMachine",
      {
        stateJson: {
          Type: "Task",
          Resource: "arn:aws:states:::states:startExecution",
          QueryLanguage: "JSONata",
          Arguments: {
            StateMachineArn:
              "arn:aws:states:ca-central-1:425362996713:stateMachine:distMapStateStackStateMachine93DE01C0-Crlnpb1C4FrX",
            Input: {
              _datadog:
                "{% ($execInput := $states.context.Execution.Input; $hasDatadogTraceId := $exists($execInput._datadog.`x-datadog-trace-id`); $hasDatadogRootExecutionId := $exists($execInput._datadog.RootExecutionId); $ddTraceContext := $hasDatadogTraceId ? {'x-datadog-trace-id': $execInput._datadog.`x-datadog-trace-id`, 'x-datadog-tags': $execInput._datadog.`x-datadog-tags`} : {'RootExecutionId': $hasDatadogRootExecutionId ?  $execInput._datadog.RootExecutionId : $states.context.Execution.Id}; $sfnContext := $merge([$states.context, {'Execution': $sift($states.context.Execution, function($v, $k) { $k != 'Input' })}]); $merge([$sfnContext, $ddTraceContext, {'serverless-version': 'v1'}])) %}",
            },
          },

          // ResultPath: "$.childOutput",
        },
      }
    );

    const parentRole = new iam.Role(this, "ParentStateMachineRole", {
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
    });

    // Add permission to invoke child state machine
    parentRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["states:StartExecution"],
        resources: [this.stepFunction.stateMachineArn],
      })
    );

    const parentStateMachine = new sfn.StateMachine(
      this,
      "UpstreamStateMachine",
      {
        definition: initialState.next(invokeChildState),
        timeout: cdk.Duration.minutes(30),
        role: parentRole,
        logs: {
          // also part of enabling cloud tracing
          destination: this.logGroup,
          level: sfn.LogLevel.ALL,
          includeExecutionData: true,
        },
      }
    );

    Tags.of(parentStateMachine).add("service", "distMapStateStack");
    Tags.of(this.stepFunction).add("env", "distMapStateStack"); // just to make my search easier.
    Tags.of(this.stepFunction).add("DD_TRACE_ENABLED", "true");
    Tags.of(this.stepFunction).add("version", "1");

    // Output the important resources
    new cdk.CfnOutput(this, "StateMachineARN", {
      value: this.stepFunction.stateMachineArn,
      description: "The ARN of the State Machine",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: dataBucket.bucketName,
      description: "The name of the S3 bucket",
    });
  }
}
