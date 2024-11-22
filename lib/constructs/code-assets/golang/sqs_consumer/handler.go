package main

import (
	"context"
	// "encoding/json"
	"fmt"

	ddlambda "github.com/DataDog/datadog-lambda-go"
	// "github.com/DataDog/sample-apps/apps/sqs/golang/internal"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func consumer(ctx context.Context, event events.SQSEvent) (events.SQSEventResponse, error) {
	// traceID := internal.TraceID(ctx)
	for _, record := range event.Records {
		// var msg internal.Message
		fmt.Printf("received sqs message %s", record.Body)
		// json.Unmarshal([]byte(record.Body), &msg)
		// ddlambda.Metric(
		// 	"trace_context.propagated.sqs", 1,
		// 	fmt.Sprintf("consumer_runtime:%s", internal.Runtime),
		// 	fmt.Sprintf("producer_runtime:%s", msg.Runtime),
		// 	fmt.Sprintf("success:%t", traceID == msg.TraceID),
		// 	"transport:sqs",
		// )
	}
	panic("erroring out!")
	return events.SQSEventResponse{}, nil
}

func main() {
	lambda.Start(ddlambda.WrapFunction(consumer, nil))
}
