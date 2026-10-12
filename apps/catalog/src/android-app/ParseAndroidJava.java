import java.io.*;
import java.util.*;
import javax.tools.*;
import com.sun.source.util.*;
/** Syntax-only parser: no Android SDK needed, does NOT type-check or build APK. */
public class ParseAndroidJava {
 public static void main(String[] args)throws Exception{
   JavaCompiler compiler=ToolProvider.getSystemJavaCompiler();
   DiagnosticCollector<JavaFileObject> diagnostics=new DiagnosticCollector<>();
   StandardJavaFileManager manager=compiler.getStandardFileManager(diagnostics,null,null);
   Iterable<? extends JavaFileObject> units=manager.getJavaFileObjectsFromStrings(Arrays.asList(args));
   JavacTask task=(JavacTask)compiler.getTask(null,manager,diagnostics,Arrays.asList("-proc:none"),null,units);
   task.parse();
   for(Diagnostic<? extends JavaFileObject> d:diagnostics.getDiagnostics()){
      if(d.getKind()==Diagnostic.Kind.ERROR){System.err.println(d);System.exit(2);}
   }
   System.out.println("OK: Java parsing (Android SDK compilation NOT performed): "+args.length+" files");
 }
}
