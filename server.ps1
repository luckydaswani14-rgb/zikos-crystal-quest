# Ziko's Crystal Quest — Diagnostic Web Server
# Uses System.Net.HttpListener to serve files and logs client exceptions.

$Port = 8000
$Prefix = "http://127.0.0.1:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)

try {
    $listener.Start()
    Write-Host "--------------------------------------------------------"
    Write-Host "  Ziko's Crystal Quest Diagnostic Server Running!       "
    Write-Host "  Open your browser to: $Prefix"
    Write-Host "  Press Ctrl+C in this terminal window to stop.         "
    Write-Host "--------------------------------------------------------"
} catch {
    Write-Error "Failed to start listener. Is port $Port already in use?"
    exit
}

# Serve loop
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath

        # Handle client diagnostic exception logger
        if ($path -eq "/error") {
            $msg = $request.QueryString["msg"]
            Write-Host "---------------- CLIENT RUNTIME EXCEPTION ----------------" -ForegroundColor Red
            Write-Host $msg -ForegroundColor Yellow
            Write-Host "----------------------------------------------------------" -ForegroundColor Red
            
            $response.StatusCode = 200
            $response.ContentType = "text/plain"
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("OK")
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        if ($path -eq "/" -or $path -eq "") {
            $path = "/index.html"
        }

        # Decode URL spaces/special characters
        $path = [System.Uri]::UnescapeDataString($path)
        $filePath = Join-Path $PSScriptRoot $path

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Simple Content-Type mapper
            if ($path.EndsWith(".html")) { $response.ContentType = "text/html" }
            elseif ($path.EndsWith(".css")) { $response.ContentType = "text/css" }
            elseif ($path.EndsWith(".js")) { $response.ContentType = "application/javascript" }
            elseif ($path.EndsWith(".json")) { $response.ContentType = "application/json" }
            elseif ($path.EndsWith(".png")) { $response.ContentType = "image/png" }
            elseif ($path.EndsWith(".jpg") -or $path.EndsWith(".jpeg")) { $response.ContentType = "image/jpeg" }
            elseif ($path.EndsWith(".svg")) { $response.ContentType = "image/svg+xml" }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
    } catch {
        # Log server exceptions
        Write-Host "Server Request error: $_"
    } finally {
        if ($null -ne $response) {
            $response.Close()
        }
    }
}
