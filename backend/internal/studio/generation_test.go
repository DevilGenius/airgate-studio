package studio

import "testing"

func TestBuildTaskInputPreservesClientModel(t *testing.T) {
	for _, operation := range []string{"generate", "edit", "inpaint"} {
		for _, override := range []string{"", "other-model"} {
			t.Run(operation+"/override="+override, func(t *testing.T) {
				req := createGenerationTaskRequest{
					Kind:      "image",
					Operation: operation,
					Model:     "client-image-alias",
					Parameters: map[string]interface{}{
						"client_model": override,
						"model":        "other-display-model",
					},
				}
				input := buildTaskInput(req)
				for _, key := range []string{"client_model", "model"} {
					if got := input[key]; got != req.Model {
						t.Fatalf("%s = %v, want requested model %q", key, got, req.Model)
					}
				}
			})
		}
	}
}

func TestBuildTaskInputKeepsEditImagesAndMask(t *testing.T) {
	req := createGenerationTaskRequest{
		Kind:      "image",
		Operation: "edit",
		Model:     "gpt-image-2",
		Prompt:    "change the jacket color",
		Parameters: map[string]interface{}{
			"size": "1024x1024",
		},
		Inputs: []generationInput{
			{Type: "image", Role: "source", URL: "data:image/png;base64,source"},
			{Type: "image", Role: "mask", URL: "data:image/png;base64,input-mask-is-ignored-here"},
		},
		Mask: &generationInput{Type: "image", Role: "mask", URL: "data:image/png;base64,mask"},
	}

	input := buildTaskInput(req)
	images, ok := input["images"].([]string)
	if !ok {
		t.Fatalf("images type = %T, want []string", input["images"])
	}
	if len(images) != 1 || images[0] != "data:image/png;base64,source" {
		t.Fatalf("images = %#v", images)
	}
	if got := input["mask"]; got != "data:image/png;base64,mask" {
		t.Fatalf("mask = %v", got)
	}
	if got := input["size"]; got != "1024x1024" {
		t.Fatalf("size = %v", got)
	}
	if got := input["preserve_reference"]; got != true {
		t.Fatalf("preserve_reference = %v, want true", got)
	}
	if got := input["prompt"]; got != "change the jacket color" {
		t.Fatalf("prompt = %v, want original prompt", got)
	}
}
