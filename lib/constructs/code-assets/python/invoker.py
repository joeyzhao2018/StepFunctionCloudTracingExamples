import json
import boto3

import os
lambda_client = boto3.client('lambda')
target_function_name = os.environ.get("TARGET_FUNCTION", "dummy")


def invoke(event, context):

    # Invoke second Lambda function
    response = lambda_client.invoke(
        FunctionName=target_function_name,
        InvocationType='RequestResponse',
        Payload=json.dumps({"from": "invoker"})
    )

    # Parse response from second Lambda
    payload = json.loads(response['Payload'].read())

    return {
        'statusCode': 200,
        'body': payload
    }

def dummy(event, context):
    print("Got context", context)
    return {
        'statusCode': 200,
        'body': 'Hello from target'
    }
