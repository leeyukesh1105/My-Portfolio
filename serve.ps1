# Simple Native PowerShell Static Web Server
# Serves the current directory on http://localhost:8000
# No dependencies (Node.js/Python) required!

$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "============================================="
    Write-Host " Lee Yukesh Portfolio Web Server is running! "
    Write-Host " Open your browser and go to:                "
    Write-Host " http://localhost:$port/                     "
    Write-Host "============================================="
    Write-Host "Press Ctrl+C in this terminal to stop server."
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Translate URL path to local file path
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }
        
        # Strip leading slash for Join-Path
        $relPath = $urlPath.Substring(1)
        $filePath = Join-Path (Get-Location) $relPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            
            # Match MIME Types
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".gif"  { "image/gif" }
                ".svg"  { "image/svg+xml" }
                ".json" { "application/json; charset=utf-8" }
                default { "application/octet-stream" }
            }
            
            # CORS headers
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found: $urlPath")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $errBytes.Length
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Error $_
} finally {
    $listener.Stop()
}
