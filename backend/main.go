package main

import (
	"github.com/DouDOU-start/airgate-studio/backend/internal/studio"
	sdkgrpc "github.com/DouDOU-start/airgate-sdk/runtimego/grpc"
)

func main() {
	sdkgrpc.Serve(&studio.StudioPlugin{})
}
