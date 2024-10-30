import json
import boto3

import os
lambda_client = boto3.client('lambda')
target_function_name = os.environ["TARGET_FUNCTION"]


def invoke(event, context):

    # Invoke second Lambda function
    response = lambda_client.invoke(
        FunctionName=target_function_name,
        InvocationType='RequestResponse',
        Payload=json.dumps(event)
    )

    # Parse response from second Lambda
    payload = json.loads(response['Payload'].read())

    return {
        'statusCode': 200,
        'body': payload
    }

def dummy(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from target'
    }
