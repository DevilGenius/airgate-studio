package main

import (
	sdkgrpc "github.com/DevilGenius/airgate-sdk/runtimego/grpc"
	"github.com/DevilGenius/airgate-studio/backend/internal/studio"
)

func main() {
	sdkgrpc.Serve(&studio.StudioPlugin{})
}
