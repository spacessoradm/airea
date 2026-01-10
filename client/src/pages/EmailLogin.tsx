import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { queryClient } from "@/lib/queryClient";
import { signInWithGoogle, signInWithApple } from "@/lib/firebase";

// Improved validation schemas
const loginSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .toLowerCase()
    .min(1, "Email is required"),
  password: z.string()
    .min(1, "Password is required")
    .max(100, "Password is too long"),
});

const registerSchema = z.object({
  email: z.string()
    .trim()
    .email("Invalid email address")
    .toLowerCase()
    .min(1, "Email is required"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  lastName: z.string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name is too long"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

// Reusable auth request handler
const handleAuthRequest = async (
  url: string,
  data: any,
  errorContext: string
) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      
      // Handle specific HTTP status codes
      if (response.status === 401) {
        throw new Error("Invalid email or password");
      } else if (response.status === 409) {
        throw new Error("An account with this email already exists");
      } else if (response.status === 429) {
        throw new Error("Too many attempts. Please try again later.");
      } else if (response.status === 500) {
        throw new Error("Server error. Please try again.");
      }
      
      throw new Error(error.message || `${errorContext} failed`);
    }

    return await response.json();
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.');
    }
    if (!navigator.onLine) {
      throw new Error('No internet connection. Please check your network.');
    }
    throw error;
  }
};

export default function EmailLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Get redirect URL from query params
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect') || '/';

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const onLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await handleAuthRequest('/api/auth/signin', data, 'Login');
      
      // Validate response
      if (!user || !user.id) {
        throw new Error("Invalid server response");
      }
      
      // Invalidate auth query to refresh user data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName}!`,
      });

      // Redirect based on role or to specified redirect URL
      if (user.role === 'admin') {
        setLocation('/admin/dashboard');
      } else if (user.role === 'agent') {
        setLocation('/comprehensive-agent');
      } else {
        setLocation(redirectUrl);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterFormData) => {
    setIsRegistering(true);
    try {
      const user = await handleAuthRequest('/api/auth/register', data, 'Registration');
      
      // Validate response
      if (!user || !user.id) {
        throw new Error("Invalid server response");
      }
      
      // Invalidate auth query to refresh user data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

      // Reset form on success
      registerForm.reset();

      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName}! Your account has been created.`,
      });

      // Redirect to specified URL or home
      setLocation(redirectUrl);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      
      if (result) {
        const { user, token } = result;
        console.log("Processing popup result:", user.email);
        
        // Send Firebase token to backend
        const response = await fetch("/api/auth/firebase", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Authentication failed");
        }

        const userData = await response.json();
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

        toast({
          title: "Login successful",
          description: `Welcome, ${userData.firstName}!`,
        });

        // Redirect to specified URL
        setTimeout(() => {
          setLocation(redirectUrl);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      
      toast({
        title: "Google Sign-In failed",
        description: error.message || "Could not sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithApple();
      
      if (result) {
        const { user, token } = result;
        
        // Send Firebase token to backend
        const response = await fetch("/api/auth/firebase", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Authentication failed");
        }

        const userData = await response.json();
        await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });

        toast({
          title: "Login successful",
          description: `Welcome, ${userData.firstName}!`,
        });

        setTimeout(() => {
          setLocation(redirectUrl);
        }, 1000);
      }
    } catch (error: any) {
      console.error("Apple sign-in error:", error);
      
      toast({
        title: "Apple Sign-In failed",
        description: error.message || "Could not sign in with Apple",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700">Logging you in...</p>
          </div>
        </div>
      )}
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Shield className="h-12 w-12 text-blue-600 mx-auto" />
          </div>
          <CardTitle className="text-2xl">Welcome to Airea</CardTitle>
          <CardDescription>
            Sign in or create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Social Sign-In Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              onClick={onGoogleSignIn}
              disabled={isLoading || isRegistering}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-12"
              data-testid="button-google-signin"
            >
              <FcGoogle className="h-5 w-5" />
              <span>Continue with Google</span>
            </Button>

            <Button
              onClick={onAppleSignIn}
              disabled={isLoading || isRegistering}
              variant="outline"
              className="w-full flex items-center justify-center gap-2 h-12 bg-black text-white hover:bg-gray-800 hover:text-white"
              data-testid="button-apple-signin"
            >
              <FaApple className="h-5 w-5" />
              <span>Continue with Apple</span>
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your.email@example.com"
                            disabled={isLoading}
                            data-testid="input-login-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="Enter your password"
                            disabled={isLoading}
                            data-testid="input-login-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="John"
                              disabled={isRegistering}
                              data-testid="input-register-firstname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Doe"
                              disabled={isRegistering}
                              data-testid="input-register-lastname"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="your.email@example.com"
                            disabled={isRegistering}
                            data-testid="input-register-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="At least 6 characters"
                            disabled={isRegistering}
                            data-testid="input-register-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isRegistering}
                    data-testid="button-register"
                  >
                    {isRegistering ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}