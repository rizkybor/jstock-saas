<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Trial',
                'slug' => 'trial',
                'price' => 0,
                'max_users' => 3,
                'max_transactions_per_month' => 50,
                'features' => ['auto_invoice', 'cogs_auto_calc'],
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'price' => 149000,
                'max_users' => 5,
                'max_transactions_per_month' => 200,
                'features' => ['auto_invoice', 'cogs_auto_calc'],
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price' => 349000,
                'max_users' => 20,
                'max_transactions_per_month' => 1000,
                'features' => ['auto_invoice', 'cogs_auto_calc', 'auto_sign_stamp', 'export_report'],
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => null,
                'max_users' => null,
                'max_transactions_per_month' => null,
                'features' => ['auto_invoice', 'cogs_auto_calc', 'auto_sign_stamp', 'export_report', 'white_label'],
            ],
        ];

        foreach ($plans as $plan) {
            Plan::updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
