import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      const res = await axios.post('/api/v1/auth/login', data);
      // Save token (example)
      localStorage.setItem('token', res.data.token);
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded shadow p-8 mt-12">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary"
            autoComplete="email"
          />
          {errors.email && <div className="text-danger text-xs mt-1">{errors.email.message}</div>}
        </div>
        <div>
          <label className="block mb-1 font-medium">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-primary"
            autoComplete="current-password"
          />
          {errors.password && <div className="text-danger text-xs mt-1">{errors.password.message}</div>}
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
