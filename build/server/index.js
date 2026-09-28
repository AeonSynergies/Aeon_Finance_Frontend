import { Links, Meta, Outlet, Scripts, ScrollRestoration, ServerRouter, UNSAFE_withComponentProps, UNSAFE_withErrorBoundaryProps, UNSAFE_withHydrateFallbackProps, isRouteErrorResponse } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region node_modules/@react-router/dev/dist/config/defaults/entry.server.web.tsx
var entry_server_web_exports = /* @__PURE__ */ __exportAll({
	default: () => handleRequest,
	streamTimeout: () => streamTimeout
});
var streamTimeout = 5e3;
async function handleRequest(request, responseStatusCode, responseHeaders, routerContext, _loadContext) {
	if (request.method.toUpperCase() === "HEAD") return new Response(null, {
		status: responseStatusCode,
		headers: responseHeaders
	});
	let shellRendered = false;
	let userAgent = request.headers.get("user-agent");
	const body = await renderToReadableStream(/* @__PURE__ */ jsx(ServerRouter, {
		context: routerContext,
		url: request.url
	}), {
		signal: AbortSignal.timeout(6e3),
		onError(error) {
			responseStatusCode = 500;
			if (shellRendered) console.error(error);
		}
	});
	shellRendered = true;
	if (userAgent && isbot(userAgent) || routerContext.isSpaMode) await body.allReady;
	responseHeaders.set("Content-Type", "text/html");
	return new Response(body, {
		headers: responseHeaders,
		status: responseStatusCode
	});
}
//#endregion
//#region app/lib/queryClient.ts
var queryClient = new QueryClient({ defaultOptions: { queries: {
	staleTime: 3e4,
	retry: 1,
	refetchOnWindowFocus: false
} } });
//#endregion
//#region app/root.tsx
var root_exports = /* @__PURE__ */ __exportAll({
	ErrorBoundary: () => ErrorBoundary,
	HydrateFallback: () => HydrateFallback,
	Layout: () => Layout,
	default: () => root_default,
	links: () => links,
	meta: () => meta
});
var links = () => [
	{
		rel: "preconnect",
		href: "https://fonts.googleapis.com"
	},
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous"
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap"
	}
];
var meta = () => [{ title: "Aeon Finance" }, {
	name: "description",
	content: "DSP Financial Operations Platform"
}];
function Layout({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsxs("head", { children: [
			/* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
			/* @__PURE__ */ jsx("meta", {
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			}),
			/* @__PURE__ */ jsx(Meta, {}),
			/* @__PURE__ */ jsx(Links, {})
		] }), /* @__PURE__ */ jsxs("body", { children: [
			children,
			/* @__PURE__ */ jsx(ScrollRestoration, {}),
			/* @__PURE__ */ jsx(Scripts, {})
		] })]
	});
}
var root_default = UNSAFE_withComponentProps(function App() {
	return /* @__PURE__ */ jsxs(QueryClientProvider, {
		client: queryClient,
		children: [
			/* @__PURE__ */ jsx(Outlet, {}),
			/* @__PURE__ */ jsx(Toaster, {
				richColors: true,
				position: "top-right"
			}),
			/* @__PURE__ */ jsx(ReactQueryDevtools, { initialIsOpen: false })
		]
	});
});
var HydrateFallback = UNSAFE_withHydrateFallbackProps(function HydrateFallback() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center text-sm text-muted-foreground",
		children: "Loading…"
	});
});
var ErrorBoundary = UNSAFE_withErrorBoundaryProps(function ErrorBoundary({ error }) {
	let message = "Something went wrong";
	let details = "An unexpected error occurred. Please try again.";
	let stack;
	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
	}
	return /* @__PURE__ */ jsxs("main", {
		className: "container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-3 p-4 text-center",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "text-lg font-semibold",
				children: message
			}),
			/* @__PURE__ */ jsx("p", {
				className: "max-w-md text-sm text-muted-foreground",
				children: details
			}),
			/* @__PURE__ */ jsx("a", {
				href: "/dashboard",
				className: "rounded-md border px-3 py-1.5 text-sm",
				children: "Go to dashboard"
			}),
			stack
		]
	});
});
//#endregion
//#region \0virtual:react-router/server-manifest
var server_manifest_default = {
	"entry": {
		"module": "/assets/entry.client-DHkOiu3p.js",
		"imports": [
			"/assets/utils-BpIe-t7-.js",
			"/assets/react-dom-COFDsssW.js",
			"/assets/components-urye_E6P.js",
			"/assets/errorBoundaries-YYB_7Gva.js",
			"/assets/jsx-runtime-CPNstcaJ.js",
			"/assets/preload-helper-BZ1Pz5am.js"
		],
		"css": []
	},
	"routes": {
		"root": {
			"id": "root",
			"parentId": void 0,
			"path": "",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": true,
			"module": "/assets/root-DAdjb7p9.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/components-urye_E6P.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/queryClient-BqvLbAEg.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js"
			],
			"css": ["/assets/root-Wfw5j1zo.css"],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/login": {
			"id": "routes/login",
			"parentId": "root",
			"path": "login",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/login-main-CrzwZn6-.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/login-client-loader-DuoUk-mr.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/login-client-loader-DuoUk-mr.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/_protected": {
			"id": "routes/_protected",
			"parentId": "root",
			"path": void 0,
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/_protected-main-CVKq5wPO.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/_protected-client-loader-DRhzjP6T.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/_protected-client-loader-DRhzjP6T.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/index": {
			"id": "routes/index",
			"parentId": "routes/_protected",
			"path": void 0,
			"index": true,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/index-main-Djqv7dNg.js",
			"imports": ["/assets/components-urye_E6P.js", "/assets/utils-BpIe-t7-.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/index-client-loader-CZggQTp-.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/dashboard": {
			"id": "routes/dashboard",
			"parentId": "routes/_protected",
			"path": "dashboard",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/dashboard-psOcFpny.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/arrow-right-klvP67-V.js",
				"/assets/badge-dollar-sign-jk2ymdBc.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/truck--VqwomWM.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/upload": {
			"id": "routes/upload",
			"parentId": "routes/_protected",
			"path": "upload",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/upload-CNWsiQea.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/arrow-left-CBmp_95_.js",
				"/assets/arrow-right-klvP67-V.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/download-BUgHh2I9.js",
				"/assets/file-spreadsheet-_uDSs4hU.js",
				"/assets/triangle-alert-Cn3TbbSL.js",
				"/assets/formatters-zEuxtmpV.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/calendar": {
			"id": "routes/calendar",
			"parentId": "routes/_protected",
			"path": "calendar",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/calendar-DlwofDDS.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/chevron-left-8jW-PHS2.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/download-BUgHh2I9.js",
				"/assets/gavel-BfKvFtQC.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/triangle-alert-Cn3TbbSL.js",
				"/assets/truck--VqwomWM.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/badge-DSAWTfJC.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/reports": {
			"id": "routes/reports",
			"parentId": "routes/_protected",
			"path": "reports",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/reports-V8p7jFla.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/download-BUgHh2I9.js",
				"/assets/eye-Bl044wGb.js",
				"/assets/file-spreadsheet-_uDSs4hU.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/rate-card": {
			"id": "routes/rate-card",
			"parentId": "routes/_protected",
			"path": "rate-card",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/rate-card-tEl-JdlX.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/trash-DQLfG3C2.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/team": {
			"id": "routes/team",
			"parentId": "routes/_protected",
			"path": "team",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/team-B6ljOxX-.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/mail-BEY2_Vp7.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/badge-DSAWTfJC.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/settings": {
			"id": "routes/settings",
			"parentId": "routes/_protected",
			"path": "settings",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/settings-BFoZY4Hk.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/news": {
			"id": "routes/news",
			"parentId": "routes/_protected",
			"path": "news",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/news-BVQkl0vo.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/arrow-right-klvP67-V.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/help": {
			"id": "routes/help",
			"parentId": "routes/_protected",
			"path": "help",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/help-BF4CKTQu.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/analytics/index": {
			"id": "routes/analytics/index",
			"parentId": "routes/_protected",
			"path": "analytics",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/index-Dh5q2hKR.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/arrow-right-klvP67-V.js",
				"/assets/badge-dollar-sign-jk2ymdBc.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/eye-Bl044wGb.js",
				"/assets/repeat-b3ZMmP-v.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trending-up-_YiThFN-.js",
				"/assets/truck--VqwomWM.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/analytics/overtime": {
			"id": "routes/analytics/overtime",
			"parentId": "routes/_protected",
			"path": "analytics/overtime",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/overtime-main-Djqv7dNg.js",
			"imports": ["/assets/components-urye_E6P.js", "/assets/utils-BpIe-t7-.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/overtime-client-loader-CtK-JKbR.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/analytics/cap": {
			"id": "routes/analytics/cap",
			"parentId": "routes/_protected",
			"path": "analytics/cap",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/cap-main-Djqv7dNg.js",
			"imports": ["/assets/components-urye_E6P.js", "/assets/utils-BpIe-t7-.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/cap-client-loader-CtK-JKbR.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/analytics/payroll-review": {
			"id": "routes/analytics/payroll-review",
			"parentId": "routes/_protected",
			"path": "analytics/payroll-review",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": true,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/payroll-review-main-Djqv7dNg.js",
			"imports": ["/assets/components-urye_E6P.js", "/assets/utils-BpIe-t7-.js"],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": "/assets/payroll-review-client-loader-CtK-JKbR.js",
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/analytics/payroll-revenue": {
			"id": "routes/analytics/payroll-revenue",
			"parentId": "routes/_protected",
			"path": "analytics/payroll-revenue",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/payroll-revenue-kF9ZTVWB.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/arrow-left-CBmp_95_.js",
				"/assets/badge-dollar-sign-jk2ymdBc.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/dollar-sign-Z9j0INEC.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trending-up-_YiThFN-.js",
				"/assets/PageTabs-DxaSHpUG.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/index": {
			"id": "routes/validation/index",
			"parentId": "routes/_protected",
			"path": "validation",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/index-BrSm860L.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/arrow-right-klvP67-V.js",
				"/assets/badge-dollar-sign-jk2ymdBc.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/repeat-b3ZMmP-v.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/truck--VqwomWM.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/schemas-FRKNc6TF.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/timecard": {
			"id": "routes/validation/timecard",
			"parentId": "routes/_protected",
			"path": "validation/timecard",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/timecard-CgBk7ORw.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/chevron-left-8jW-PHS2.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/dollar-sign-Z9j0INEC.js",
				"/assets/eye-Bl044wGb.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/ColumnFilter-B7v3ZqPK.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/mail-BEY2_Vp7.js",
				"/assets/ValidationShell-DyzxhJa4.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trending-up-_YiThFN-.js",
				"/assets/triangle-alert-Cn3TbbSL.js",
				"/assets/truck--VqwomWM.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/formatters-zEuxtmpV.js",
				"/assets/badge-DSAWTfJC.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/textarea-BwjYL_yq.js",
				"/assets/BulkOverrideDialog-C4h3HbDc.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/trash-DQLfG3C2.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/routes/index": {
			"id": "routes/validation/routes/index",
			"parentId": "routes/_protected",
			"path": "validation/routes",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/index-IBJ-P8ZO.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clipboard-list-nne0hEZ2.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/download-BUgHh2I9.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/ColumnFilter-B7v3ZqPK.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/ValidationShell-DyzxhJa4.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js",
				"/assets/triangle-alert-Cn3TbbSL.js",
				"/assets/truck--VqwomWM.js",
				"/assets/badge-DSAWTfJC.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/textarea-BwjYL_yq.js",
				"/assets/BulkOverrideDialog-C4h3HbDc.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/DisputeTrackerTab-CgjwUEeo.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/routes/invoice": {
			"id": "routes/validation/routes/invoice",
			"parentId": "routes/_protected",
			"path": "validation/routes/invoice",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/invoice-Bau5lIoM.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/file-spreadsheet-_uDSs4hU.js",
				"/assets/ColumnFilter-B7v3ZqPK.js",
				"/assets/gavel-BfKvFtQC.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/ValidationShell-DyzxhJa4.js",
				"/assets/scroll-text-B2EySvX8.js",
				"/assets/triangle-alert-Cn3TbbSL.js",
				"/assets/badge-DSAWTfJC.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/textarea-BwjYL_yq.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/DisputeTrackerTab-CgjwUEeo.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/fleet/rfs-afs": {
			"id": "routes/validation/fleet/rfs-afs",
			"parentId": "routes/_protected",
			"path": "validation/fleet/rfs-afs",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/rfs-afs-XQLu4OO6.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clipboard-list-nne0hEZ2.js",
				"/assets/download-BUgHh2I9.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/ColumnFilter-B7v3ZqPK.js",
				"/assets/repeat-b3ZMmP-v.js",
				"/assets/truck--VqwomWM.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/textarea-BwjYL_yq.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js",
				"/assets/triangle-alert-Cn3TbbSL.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/fleet/revenue": {
			"id": "routes/validation/fleet/revenue",
			"parentId": "routes/_protected",
			"path": "validation/fleet/revenue",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/revenue-WdaOBrV3.js",
			"imports": [
				"/assets/utils-BpIe-t7-.js",
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/badge-dollar-sign-jk2ymdBc.js",
				"/assets/download-BUgHh2I9.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/ColumnFilter-B7v3ZqPK.js",
				"/assets/gavel-BfKvFtQC.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/ValidationShell-DyzxhJa4.js",
				"/assets/scroll-text-B2EySvX8.js",
				"/assets/triangle-alert-Cn3TbbSL.js",
				"/assets/badge-DSAWTfJC.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/DisputeTrackerTab-CgjwUEeo.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/select-C9m5LEao.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/fleet/rental": {
			"id": "routes/validation/fleet/rental",
			"parentId": "routes/_protected",
			"path": "validation/fleet/rental",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/rental-C0m2Bc7F.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/FleetSubModule-BWqa1P8q.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/select-C9m5LEao.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js",
				"/assets/triangle-alert-Cn3TbbSL.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/fleet/repair": {
			"id": "routes/validation/fleet/repair",
			"parentId": "routes/_protected",
			"path": "validation/fleet/repair",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/repair-C09V5HT-.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/FleetSubModule-BWqa1P8q.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/select-C9m5LEao.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js",
				"/assets/triangle-alert-Cn3TbbSL.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/validation/fleet/insurance": {
			"id": "routes/validation/fleet/insurance",
			"parentId": "routes/_protected",
			"path": "validation/fleet/insurance",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/insurance-CqDa8SYr.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/FleetSubModule-BWqa1P8q.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/AppLayout-LxQgdF44.js",
				"/assets/store-h0Y0BPV8.js",
				"/assets/dist-CsOcTCzR.js",
				"/assets/CreateJobDialog-hqMKJqwD.js",
				"/assets/StatusCells-BUWaz134.js",
				"/assets/useModuleJobs-BJVMlKda.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js",
				"/assets/react-dom-COFDsssW.js",
				"/assets/QueryClientProvider-B1pxiRR8.js",
				"/assets/mutation-CmU9wGwd.js",
				"/assets/query-rkqZs9PU.js",
				"/assets/auth-C8Tw52db.js",
				"/assets/schemas-FRKNc6TF.js",
				"/assets/select-C9m5LEao.js",
				"/assets/plus-DI_CjhJO.js",
				"/assets/circle-check-DGzmN-Y3.js",
				"/assets/clock-Czu5_xfF.js",
				"/assets/lock-CehTtWuR.js",
				"/assets/shield-alert-gBuw3Pkb.js",
				"/assets/trash-DQLfG3C2.js",
				"/assets/triangle-alert-Cn3TbbSL.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		},
		"routes/not-found": {
			"id": "routes/not-found",
			"parentId": "root",
			"path": "*",
			"index": void 0,
			"caseSensitive": void 0,
			"hasAction": false,
			"hasLoader": false,
			"hasClientAction": false,
			"hasClientLoader": false,
			"hasClientMiddleware": false,
			"hasDefaultExport": true,
			"hasErrorBoundary": false,
			"module": "/assets/not-found-CeUI3qJt.js",
			"imports": [
				"/assets/components-urye_E6P.js",
				"/assets/lib-DrPRYfMp.js",
				"/assets/jsx-runtime-CPNstcaJ.js",
				"/assets/utils-BpIe-t7-.js",
				"/assets/errorBoundaries-YYB_7Gva.js",
				"/assets/preload-helper-BZ1Pz5am.js"
			],
			"css": [],
			"clientActionModule": void 0,
			"clientLoaderModule": void 0,
			"clientMiddlewareModule": void 0,
			"hydrateFallbackModule": void 0
		}
	},
	"url": "/assets/manifest-7fe67ce6.js",
	"version": "7fe67ce6",
	"sri": void 0
};
//#endregion
//#region \0virtual:react-router/server-build
var route1 = { default: () => null };
var route2 = { default: () => null };
var route3 = { default: () => null };
var route4 = { default: () => null };
var route5 = { default: () => null };
var route6 = { default: () => null };
var route7 = { default: () => null };
var route8 = { default: () => null };
var route9 = { default: () => null };
var route10 = { default: () => null };
var route11 = { default: () => null };
var route12 = { default: () => null };
var route13 = { default: () => null };
var route14 = { default: () => null };
var route15 = { default: () => null };
var route16 = { default: () => null };
var route17 = { default: () => null };
var route18 = { default: () => null };
var route19 = { default: () => null };
var route20 = { default: () => null };
var route21 = { default: () => null };
var route22 = { default: () => null };
var route23 = { default: () => null };
var route24 = { default: () => null };
var route25 = { default: () => null };
var route26 = { default: () => null };
var route27 = { default: () => null };
var assetsBuildDirectory = "build/client";
var basename = "/";
var future = {
	"unstable_enableNodeReadableStream": false,
	"unstable_optimizeDeps": false
};
var ssr = false;
var isSpaMode = true;
var prerender = [];
var routeDiscovery = { "mode": "initial" };
var publicPath = "/";
var entry = { module: entry_server_web_exports };
var routes = {
	"root": {
		id: "root",
		parentId: void 0,
		path: "",
		index: void 0,
		caseSensitive: void 0,
		module: root_exports
	},
	"routes/login": {
		id: "routes/login",
		parentId: "root",
		path: "login",
		index: void 0,
		caseSensitive: void 0,
		module: route1
	},
	"routes/_protected": {
		id: "routes/_protected",
		parentId: "root",
		path: void 0,
		index: void 0,
		caseSensitive: void 0,
		module: route2
	},
	"routes/index": {
		id: "routes/index",
		parentId: "routes/_protected",
		path: void 0,
		index: true,
		caseSensitive: void 0,
		module: route3
	},
	"routes/dashboard": {
		id: "routes/dashboard",
		parentId: "routes/_protected",
		path: "dashboard",
		index: void 0,
		caseSensitive: void 0,
		module: route4
	},
	"routes/upload": {
		id: "routes/upload",
		parentId: "routes/_protected",
		path: "upload",
		index: void 0,
		caseSensitive: void 0,
		module: route5
	},
	"routes/calendar": {
		id: "routes/calendar",
		parentId: "routes/_protected",
		path: "calendar",
		index: void 0,
		caseSensitive: void 0,
		module: route6
	},
	"routes/reports": {
		id: "routes/reports",
		parentId: "routes/_protected",
		path: "reports",
		index: void 0,
		caseSensitive: void 0,
		module: route7
	},
	"routes/rate-card": {
		id: "routes/rate-card",
		parentId: "routes/_protected",
		path: "rate-card",
		index: void 0,
		caseSensitive: void 0,
		module: route8
	},
	"routes/team": {
		id: "routes/team",
		parentId: "routes/_protected",
		path: "team",
		index: void 0,
		caseSensitive: void 0,
		module: route9
	},
	"routes/settings": {
		id: "routes/settings",
		parentId: "routes/_protected",
		path: "settings",
		index: void 0,
		caseSensitive: void 0,
		module: route10
	},
	"routes/news": {
		id: "routes/news",
		parentId: "routes/_protected",
		path: "news",
		index: void 0,
		caseSensitive: void 0,
		module: route11
	},
	"routes/help": {
		id: "routes/help",
		parentId: "routes/_protected",
		path: "help",
		index: void 0,
		caseSensitive: void 0,
		module: route12
	},
	"routes/analytics/index": {
		id: "routes/analytics/index",
		parentId: "routes/_protected",
		path: "analytics",
		index: void 0,
		caseSensitive: void 0,
		module: route13
	},
	"routes/analytics/overtime": {
		id: "routes/analytics/overtime",
		parentId: "routes/_protected",
		path: "analytics/overtime",
		index: void 0,
		caseSensitive: void 0,
		module: route14
	},
	"routes/analytics/cap": {
		id: "routes/analytics/cap",
		parentId: "routes/_protected",
		path: "analytics/cap",
		index: void 0,
		caseSensitive: void 0,
		module: route15
	},
	"routes/analytics/payroll-review": {
		id: "routes/analytics/payroll-review",
		parentId: "routes/_protected",
		path: "analytics/payroll-review",
		index: void 0,
		caseSensitive: void 0,
		module: route16
	},
	"routes/analytics/payroll-revenue": {
		id: "routes/analytics/payroll-revenue",
		parentId: "routes/_protected",
		path: "analytics/payroll-revenue",
		index: void 0,
		caseSensitive: void 0,
		module: route17
	},
	"routes/validation/index": {
		id: "routes/validation/index",
		parentId: "routes/_protected",
		path: "validation",
		index: void 0,
		caseSensitive: void 0,
		module: route18
	},
	"routes/validation/timecard": {
		id: "routes/validation/timecard",
		parentId: "routes/_protected",
		path: "validation/timecard",
		index: void 0,
		caseSensitive: void 0,
		module: route19
	},
	"routes/validation/routes/index": {
		id: "routes/validation/routes/index",
		parentId: "routes/_protected",
		path: "validation/routes",
		index: void 0,
		caseSensitive: void 0,
		module: route20
	},
	"routes/validation/routes/invoice": {
		id: "routes/validation/routes/invoice",
		parentId: "routes/_protected",
		path: "validation/routes/invoice",
		index: void 0,
		caseSensitive: void 0,
		module: route21
	},
	"routes/validation/fleet/rfs-afs": {
		id: "routes/validation/fleet/rfs-afs",
		parentId: "routes/_protected",
		path: "validation/fleet/rfs-afs",
		index: void 0,
		caseSensitive: void 0,
		module: route22
	},
	"routes/validation/fleet/revenue": {
		id: "routes/validation/fleet/revenue",
		parentId: "routes/_protected",
		path: "validation/fleet/revenue",
		index: void 0,
		caseSensitive: void 0,
		module: route23
	},
	"routes/validation/fleet/rental": {
		id: "routes/validation/fleet/rental",
		parentId: "routes/_protected",
		path: "validation/fleet/rental",
		index: void 0,
		caseSensitive: void 0,
		module: route24
	},
	"routes/validation/fleet/repair": {
		id: "routes/validation/fleet/repair",
		parentId: "routes/_protected",
		path: "validation/fleet/repair",
		index: void 0,
		caseSensitive: void 0,
		module: route25
	},
	"routes/validation/fleet/insurance": {
		id: "routes/validation/fleet/insurance",
		parentId: "routes/_protected",
		path: "validation/fleet/insurance",
		index: void 0,
		caseSensitive: void 0,
		module: route26
	},
	"routes/not-found": {
		id: "routes/not-found",
		parentId: "root",
		path: "*",
		index: void 0,
		caseSensitive: void 0,
		module: route27
	}
};
var allowedActionOrigins = false;
//#endregion
export { allowedActionOrigins, server_manifest_default as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, prerender, publicPath, routeDiscovery, routes, ssr };
