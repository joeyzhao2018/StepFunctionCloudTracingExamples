package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	ddlambda "github.com/DataDog/datadog-lambda-go"
	// "github.com/DataDog/sample-apps/apps/sqs/golang/internal"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go/aws"
	awstrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/aws/aws-sdk-go-v2/aws"
)

var (
	client = func() *sqs.Client {
		cfg, _ := config.LoadDefaultConfig(context.Background())
		awstrace.AppendMiddleware(&cfg)
		return sqs.NewFromConfig(cfg)
	}()

	queueUrls = strings.Split(os.Getenv("SQS_QUEUE_URLS"), ",")
)

func producer(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// msg, _ := json.Marshal(internal.Message{
	// 	Runtime: internal.Runtime,
	// 	TraceID: internal.TraceID(ctx),
	// })
	msg := "hello world"

	for _, url := range queueUrls {
		fmt.Printf("sending sqs message %s to %s\n", string(msg), url)
		client.SendMessage(ctx, &sqs.SendMessageInput{
			MessageBody: aws.String(string(msg)),
			QueueUrl:    aws.String(url),
		})
	}

	return events.APIGatewayProxyResponse{
		Body:       "ok",
		StatusCode: 200,
	}, nil
}

func main() {
	lambda.Start(ddlambda.WrapFunction(producer, nil))
}
