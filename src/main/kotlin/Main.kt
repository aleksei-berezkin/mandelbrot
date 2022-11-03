
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.regex.Pattern

fun main() {
    embeddedServer(Netty, 8080) {
        routing {
            get("*") {
                val fileNameAndType = getFileNameAndContentType(call.request.path())
                if (fileNameAndType == null) {
                    call.respond(HttpStatusCode.NotFound)
                    return@get
                }

                val (fileName, contentType) = fileNameAndType
                val fileStream = javaClass.classLoader.getResourceAsStream("web/${fileName}")
                if (fileStream == null) {
                    call.respond(HttpStatusCode.NotFound)
                    return@get
                }

                val bytes = withContext(Dispatchers.IO) {
                    fileStream.readAllBytes()
                }

                call.respondBytes(bytes, contentType)
            }

            get("/api/draw") {
                call.respondText { "Hi!!!" }
            }
        }
    }.start(wait = true)
}

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
