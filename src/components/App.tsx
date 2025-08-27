@@ .. @@
               <div className="mt-0 pt-1 border-t border-gray-100">
-                <p className="text-gray-500 text-sm">© 2025 The Majlis. An initiative by Todak.</p>
+                <p className="text-gray-500 text-sm">
+                  © 2025 The Majlis. An initiative by Todak. 
+                  {!isAuthenticated && (
+                    <Link 
+                      to="/login" 
+                      className="ml-2 text-emerald-600 hover:text-emerald-700 transition-colors duration-200"
+                    >
+                      Admin
+                    </Link>
+                  )}
+                </p>
               </div>