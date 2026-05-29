package main

import (
	"github.com/DevilGenius/airgate-studio/backend/internal/studio"
	sdkgrpc "github.com/DevilGenius/airgate-sdk/runtimego/grpc"
)

func main() {
	sdkgrpc.Serve(&studio.StudioPlugin{})
}
