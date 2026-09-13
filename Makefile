# Lệnh dev/maintainer của fe-kit. `make help` liệt kê đầy đủ.
SHELL := /bin/bash
PNPM  ?= npx --yes pnpm@12.4.1
NAME  ?= thu-nghiem
OUT   ?= ../$(NAME)
PLATFORMS ?= web,mobile,desktop

.DEFAULT_GOAL := help

help: ## Danh sách lệnh
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*?## "};{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Cài dependency cho kit + example
	$(PNPM) install

lint: ## oxlint trên src/ và cmd/
	./node_modules/.bin/oxlint src cmd --deny-warnings

typecheck: ## tsc --noEmit cho kit
	./node_modules/.bin/tsc --noEmit

test: ## Unit test của kit
	npx vitest run

check-layers: ## Luật ranh giới (không URL trong src, không next/antd ngoài vùng cho phép)
	./scripts/check-layers.sh

example: ## Sinh lại example/ từ templates (GHI ĐÈ — templates là nguồn)
	rm -rf example
	node cmd/fe-kit/index.js new example --platforms $(PLATFORMS) --out example --kit-spec 'workspace:*'
	$(PNPM) install

verify-example: ## Fail nếu example/ đã lệch khỏi templates
	./scripts/verify-example.sh

example-check: ## type-check + build cả 3 example app
	$(PNPM) --filter './example/**' exec tsc --noEmit
	$(PNPM) --filter '@example/web' exec next build
	$(PNPM) --filter '@example/desktop' run build

verify: lint typecheck test check-layers verify-example example-check ## Cổng DUY NHẤT trước khi commit
	@echo "✓ verify xanh"

smoke: ## Nghiệm thu thật: sinh dự án mới, cài kit từ tarball, build
	./scripts/smoke.sh

new: ## Sinh dự án mới (NAME=, OUT=, PLATFORMS=)
	node cmd/fe-kit/index.js new $(NAME) --out $(OUT) --platforms $(PLATFORMS)

pack: ## Đóng tarball để thử cài nơi khác
	npm pack

hooks: ## Bật git hook của repo (mỗi clone làm một lần)
	git config core.hooksPath .githooks
	@echo "✓ core.hooksPath = .githooks"

release: ## Cắt release (VERSION=vX.Y.Z, DRY=1 để xem trước). KHÔNG push.
	./scripts/release.sh $(VERSION)

clean: ## Xoá node_modules, build output, tarball
	rm -rf node_modules example/node_modules example/apps/*/node_modules example/shared/node_modules
	rm -rf example/apps/*/.next example/apps/*/dist example/apps/*/.expo .turbo *.tgz

.PHONY: help install lint typecheck test check-layers example verify-example example-check verify smoke new pack hooks release clean
