package main

import (
	"fmt"
	"log"

	batchKube "github.com/akotlar/hail-go-batch/kubernetes"
	fastRouter "github.com/fasthttp/router"
	// "github.com/francoispqt/gojay"
	"github.com/valyala/fasthttp"
)

func index(ctx *fasthttp.RequestCtx) {
	fmt.Fprint(ctx, "Wellcome!\n")
}

func hello(ctx *fasthttp.RequestCtx) {
	fmt.Fprintf(ctx, "hello, %s!\n", ctx.UserValue("name"))
}

// https://stackoverflow.com/questions/34053815/handle-optional-json-field-in-http-request-body

// func createJob(ctx *fasthttp.RequestCtx) {
// 	parameters = gojay.Unmarshal(ctx.PostBody(), &yourStructure)
// }

func main() {
	router := fastRouter.New()
	bKubeClient := batchKube.New()

	bKubeClient.DoStuff()

	//TODO: Update grammar to be more RESTFUL (DELETE does not need /delete)
	router.GET("/", index)
	router.GET("/jobs", hello)
	router.GET("/jobs/:jobID", hello)
	router.GET("/jobs/:jobID/log", hello)
	router.DELETE("/jobs/:jobID/delete", hello)
	router.POST("/jobs/:jobID/cancel", hello)
	router.POST("/batches/create", hello)
	router.GET("/batches/:batchID", hello)
	router.DELETE("/batches/:batchID/delete", hello)
	router.POST("/pod_changed", hello)
	router.POST("/refresh_k8s_state", hello)

	log.Fatal(fasthttp.ListenAndServe(":8081", router.Handler))

	// api := clientset.CoreV1()
}
