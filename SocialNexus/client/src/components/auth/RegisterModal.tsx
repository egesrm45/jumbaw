import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DialogTitle, DialogDescription, DialogContent, Dialog, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  tcNo: z.string().length(11, 'TC Kimlik No 11 haneli olmalıdır')
    .regex(/^[1-9][0-9]{10}$/, 'Geçersiz TC Kimlik No formatı'),
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalıdır'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalıdır'),
  yearOfBirth: z.string().regex(/^(19|20)\d{2}$/, 'Geçerli bir doğum yılı giriniz (örn. 1990)'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowLogin: () => void;
}

export function RegisterModal({ isOpen, onClose, onShowLogin }: RegisterModalProps) {
  const { register } = useAuth();
  const { toast } = useToast();
  const [tcVerifying, setTcVerifying] = useState(false);
  const [tcVerified, setTcVerified] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      displayName: '',
      tcNo: '',
      firstName: '',
      lastName: '',
      yearOfBirth: '',
      password: '',
      confirmPassword: '',
    },
  });

  // TC kimlik numarası doğrulama işlemini gerçekleştiren fonksiyon
  const verifyTcIdentity = async () => {
    const tcNo = form.getValues('tcNo');
    const firstName = form.getValues('firstName');
    const lastName = form.getValues('lastName');
    const yearOfBirth = form.getValues('yearOfBirth');

    // Gerekli alanların varlığını kontrol et
    if (!tcNo || !firstName || !lastName || !yearOfBirth) {
      toast({
        title: "TC Kimlik Doğrulama Hatası",
        description: "Lütfen tüm TC kimlik bilgilerini eksiksiz doldurun",
        variant: "destructive"
      });
      return;
    }

    try {
      setTcVerifying(true);

      // API isteği gönder
      const response = await apiRequest('POST', '/api/auth/validate-tc', {
        tcNo,
        firstName,
        lastName,
        yearOfBirth
      });

      const result = await response.json();

      if (result.success) {
        setTcVerified(true);
        toast({
          title: "TC Kimlik Doğrulandı",
          description: "TC kimlik doğrulaması başarıyla tamamlandı",
          variant: "default"
        });
      } else {
        setTcVerified(false);
        toast({
          title: "TC Kimlik Doğrulama Hatası",
          description: result.message || "TC kimlik doğrulaması başarısız oldu",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      setTcVerified(false);
      toast({
        title: "TC Kimlik Doğrulama Hatası",
        description: error.message || "Doğrulama sırasında bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setTcVerifying(false);
    }
  };

  const onSubmit = async (data: RegisterFormValues) => {
    // TC Kimlik doğrulaması yapılmadıysa engelle
    if (!tcVerified) {
      toast({
        title: "Kayıt Hatası",
        description: "Kayıt olmadan önce TC kimlik doğrulaması yapılmalıdır",
        variant: "destructive"
      });
      return;
    }

    try {
      // Tüm form verilerini API'ye gönder (TC kimlik bilgileri dahil)
      await register(
        data.username,
        data.password,
        data.displayName,
        {
          tcNo: data.tcNo,
          firstName: data.firstName,
          lastName: data.lastName,
          yearOfBirth: data.yearOfBirth
        }
      );
      form.reset();
      setTcVerified(false);
      onClose();
    } catch (error) {
      // Error is handled in the auth provider
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <div className="grid grid-cols-2">
          <div className="p-6 flex flex-col justify-center">
            <DialogTitle className="text-2xl font-bold mb-2">Create an Account</DialogTitle>
            <DialogDescription className="text-lg mb-4">
              Join our forum community
            </DialogDescription>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
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
                            disabled={false}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Your Name"
                            disabled={false}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={verifyTcIdentity}
                    disabled={tcVerifying}
                    className="w-full mt-4"
                  >
                    {tcVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Doğrulanıyor...</span>
                      </>
                    ) : (
                      "TC Kimlik Doğrula"
                    )}
                  </Button>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="tcNo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TC Kimlik No</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="11111111111"
                              disabled={false || tcVerifying}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ad</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Adınızı girin"
                              disabled={false || tcVerifying}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Soyad</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Soyadınızı girin"
                              disabled={false || tcVerifying}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="yearOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Doğum Yılı</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="1990"
                              disabled={false || tcVerifying}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                
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
                            disabled={false}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            disabled={false}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-primary text-white"
                    disabled={false}
                  >
                    {false ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                
              </form>
            </Form>

            <div className="mt-4 text-center border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal text-primary"
                  onClick={() => {
                    onClose();
                    onShowLogin();
                  }}
                >
                  Log in
                </Button>
              </p>
            </div>
          </div>
          <div className="bg-slate-50 p-6 border-l">
            <h3 className="text-xl font-semibold mb-4">TC Kimlik Doğrulama</h3>
            <Form>
              <div className="space-y-3">
                {/* TC Kimlik form fields */}
                <FormField
                  control={form.control}
                  name="tcNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TC Kimlik No</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="11111111111"
                          disabled={false || tcVerifying}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Adınızı girin"
                          disabled={false || tcVerifying}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Soyad</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Soyadınızı girin"
                          disabled={false || tcVerifying}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Doğum Yılı</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="1990"
                          disabled={false || tcVerifying}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={verifyTcIdentity}
                  disabled={tcVerifying || false}
                  className="w-full mt-4"
                >
                  {tcVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Doğrulanıyor...</span>
                    </>
                  ) : (
                    "TC Kimlik Doğrula"
                  )}
                </Button>

                {tcVerified && (
                  <div className="flex items-center justify-center text-green-600 text-sm mt-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>TC Kimlik Doğrulandı</span>
                  </div>
                )}
                {!tcVerified && !tcVerifying && (
                  <div className="flex items-center justify-center text-amber-600 text-sm mt-2">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>TC Kimlik henüz doğrulanmadı</span>
                  </div>
                )}
              </div>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}