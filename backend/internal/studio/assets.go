package studio

import (
	"embed"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// webdist 是插件 web 构建产物，由 Makefile 或 release workflow 在构建前从 web/dist 复制过来。
//
//go:embed all:webdist
var webDistFS embed.FS

// GetWebAssets 实现 sdk.WebAssetsProvider，让 core 能提取并加载创作中心前端资源。
func (p *StudioPlugin) GetWebAssets() map[string][]byte {
	if assets := loadDevAssets(); len(assets) > 0 {
		return assets
	}
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

func loadDevAssets() map[string][]byte {
	_, file, _, ok := runtime.Caller(0)
	candidates := []string{
		filepath.Join("..", "web", "dist"),
		filepath.Join("web", "dist"),
	}
	if ok {
		pluginRoot := filepath.Clean(filepath.Join(filepath.Dir(file), "..", "..", ".."))
		candidates = append(candidates, filepath.Join(pluginRoot, "web", "dist"))
	}
	for _, dir := range candidates {
		if assets := loadAssetsFromDir(dir); len(assets) > 0 {
			return assets
		}
	}
	return nil
}

func loadAssetsFromDir(root string) map[string][]byte {
	info, err := os.Stat(root)
	if err != nil || !info.IsDir() {
		return nil
	}
	assets := make(map[string][]byte)
	_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info == nil || info.IsDir() {
			return nil
		}
		content, readErr := os.ReadFile(path)
		if readErr != nil {
			return nil
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			return nil
		}
		assets[filepath.ToSlash(rel)] = content
		return nil
	})
	if len(assets) == 0 {
		return nil
	}
	return assets
}
