## TL;DR

```sh
# https://blog.golang.org/generate
go generate ./...
go build
go test
./hail-go-batch
```

## Getting started with Go modules and Kubernetes

https://medium.com/programming-kubernetes/using-go-modules-with-kubernetes-api-and-client-go-projects-2f3fdd5589a

## Setting up vscode

1. https://github.com/saibing/bingo/wiki/Language-Client
2. Set the following user settings

```json
{
  "go.autocompleteUnimportedPackages": true,

  "go.languageServerExperimentalFeatures": {
    "format": false,
    "autoComplete": true,
    "rename": true,
    "goToDefinition": true,
    "hover": true,
    "signatureHelp": true,
    "goToTypeDefinition": true,
    "goToImplementation": true,
    "documentSymbols": true,
    "workspaceSymbols": true,
    "findReferences": true
  },

  "go.useLanguageServer": true,

  "go.alternateTools": {
    "go-langserver": "bingo"
  },

  "go.languageServerFlags": ["--pprof", ":6060"],

  "go.languageServerExperimentalFeatures": {
    "format": true,
    "autoComplete": true
  }
}
```
