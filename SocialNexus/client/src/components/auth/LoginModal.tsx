import React from 'react';
import { useAuth } from './AuthProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DialogTitle, DialogDescription, DialogContent, Dialog, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowRegister: () => void;
}

export function LoginModal({ isOpen, onClose, onShowRegister }: LoginModalProps) {
  const { login, isLoading } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.username, data.password);
      form.reset();
      onClose();
    } catch (error) {
      // Error is handled in the auth provider
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-xl font-semibold">Login to Forum</DialogTitle>
        <DialogDescription>
          Enter your credentials to access your account
        </DialogDescription>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="username" 
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="password" 
                      placeholder="••••••••" 
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer">Remember me</FormLabel>
                  </FormItem>
                )}
              />
              
              <a href="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-primary text-white" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>
        </Form>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto font-normal text-primary" 
              onClick={() => {
                onClose();
                onShowRegister();
              }}
            >
              Sign up
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
