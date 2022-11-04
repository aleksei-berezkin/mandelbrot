
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.util.regex.Pattern

fun main() {
    embeddedServer(Netty, 3000) {
        routing {
            get("/") {
                call.respondBytes(readFileBytes("index.html")!!, ContentType.Text.Html)
            }

            get("*") {
                val fileNameAndType = getFileNameAndContentType(call.request.path())
                if (fileNameAndType == null) {
                    call.respond(HttpStatusCode.NotFound)
                    return@get
                }

                val (fileName, contentType) = fileNameAndType
                val bytes = readFileBytes(fileName)
                if (bytes == null) {
                    call.respond(HttpStatusCode.NotFound)
                    return@get
                }

                call.respondBytes(bytes, contentType)
            }

            get("/api/draw") {
                val byteArray = draw(
                    bigDecimal(call.parameters["unit"]!!),
                    bigDecimal(call.parameters["xMin"]!!),
                    bigDecimal(call.parameters["w"]!!),
                    bigDecimal(call.parameters["yMin"]!!),
                    bigDecimal(call.parameters["h"]!!),
                    call.parameters["canvasW"]!!.toInt(),
                    call.parameters["canvasH"]!!.toInt()
                )
                call.respondBytes(byteArray)
            }
        }
    }.start(wait = true)
}

suspend fun readFileBytes(fileName: String): ByteArray? {
    val serveDir = System.getProperty("serveFromDir")
    if (serveDir != null) {
        val file = File(serveDir, fileName)
        if (!file.isFile) {
            return null
        }
        return file.readBytes()
    }

    val fileStream = Dummy.javaClass.getResourceAsStream("web/${fileName}") ?: return null
    return withContext(Dispatchers.IO) {
        fileStream.readAllBytes()
    }
}

object Dummy

val filePathPattern: Pattern = Pattern.compile("/(\\w+\\.(css|js|html|mjs))")

fun getFileNameAndContentType(path: String): Pair<String, ContentType>? {
    if (path == "/") {
        return Pair("index.html", ContentType.Text.Html)
    }

    val m = filePathPattern.matcher(path)
    if (!m.matches()) {
        return null
    }

    return Pair(
        m.group(1),
        when(m.group(2)) {
            "css" -> ContentType.Text.CSS
            "js", "mjs" -> ContentType.Application.JavaScript
            "html" -> ContentType.Text.Html
            else -> ContentType.Text.Plain
        }
    )
}
