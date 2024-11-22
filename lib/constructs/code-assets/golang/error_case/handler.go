package main

import (
	"context"
	"errors"
	"log"
	"net/http"

	ddlambda "github.com/DataDog/datadog-lambda-go"
	"github.com/aws/aws-lambda-go/lambda"
	httptrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/net/http"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

type Event struct {
	// Add any input fields you expect here
}
type Response struct {
	Message string `json:"message"`
}
func main() {
	lambda.Start(ddlambda.WrapFunction(handler, nil))
}

// func handler(ctx context.Context, ev events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
func handler(ctx context.Context, ev Event) (*Response, error) {

	// Trace an HTTP request
	req, _ := http.NewRequestWithContext(ctx, "GET", "https://www.datadoghq.com", nil)
	client := http.Client{}
	client = *httptrace.WrapClient(&client)
	client.Do(req)

	span, _ := tracer.StartSpanFromContext(ctx, "parent")
	defer span.Finish()

	log.Printf("I'm just a normal lambda")

	log.Fatal("erroring out!") // This will crash the lambda and cause no traces to be sent

	return nil, errors.New("this is a deliberately thrown error from Go lambda!")
}
