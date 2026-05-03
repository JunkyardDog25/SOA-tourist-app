package proxy

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/go-chi/chi/v5"
)

func New(target string) http.Handler {
	u, _ := url.Parse(target)
	return httputil.NewSingleHostReverseProxy(u)
}

func MountProxy(r chi.Router, path string, handler http.Handler) {
	r.Handle(path, handler)
	r.Handle(path+"/", handler)
	r.Handle(path+"/*", handler)
}
