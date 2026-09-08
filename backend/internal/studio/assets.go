package studio

import (
	"embed"
	"io/fs"
	"strings"
)

//go:embed all:webdist
var webDistFS embed.FS

// GetWebAssets serves only the assets compiled into this generation. Working
// directories and neighboring projects never influence a running artifact.
func (p *StudioPlugin) GetWebAssets() map[string][]byte {
	assets := make(map[string][]byte)
	_ = fs.WalkDir(webDistFS, "webdist", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}
		content, err := webDistFS.ReadFile(path)
		if err != nil {
			return nil
		}
		rel := strings.TrimPrefix(path, "webdist/")
		if rel == "" || rel == ".gitkeep" || rel == "placeholder.txt" {
			return nil
		}
		assets[rel] = content
		return nil
	})
	return assets
}
