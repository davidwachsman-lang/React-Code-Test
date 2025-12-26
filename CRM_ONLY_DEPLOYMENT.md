# Deploying CRM-Only Version to Vercel

## Method 1: URL Parameter (Easiest - No Rebuild Needed!)

**Simply add `?crm-only=true` to your Vercel URL:**
- Example: `https://your-app.vercel.app?crm-only=true`
- This will enable CRM-only mode and save it to localStorage
- Works immediately without any rebuilds or environment variable changes

## Method 2: Environment Variable (Permanent)

1. **Set Environment Variable in Vercel:**
   - Go to your Vercel project dashboard
   - Navigate to **Settings** → **Environment Variables**
   - Add a new variable:
     - **Name:** `VITE_CRM_ONLY`
     - **Value:** `true`
     - **Environment:** Select **Production**, **Preview**, and **Development** (or at least Production)
   - Click **Save**

2. **Trigger a New Build:**
   - After setting the environment variable, you **MUST** trigger a new deployment
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment, OR
   - Push a new commit to trigger automatic deployment
   - The environment variable is only available at **build time**, not runtime

3. **Verify:**
   - After deployment completes, visit your Vercel URL
   - You should see only the CRM page (no navigation sidebar)
   - All routes should redirect to show CRM content

## Troubleshooting

If you still see the full app after setting the variable:

1. **Check the variable is set correctly:**
   - Variable name must be exactly: `VITE_CRM_ONLY`
   - Value must be exactly: `true` (lowercase, no quotes)

2. **Ensure you triggered a new build:**
   - Environment variables are baked into the build
   - Old deployments won't have the new variable
   - You must redeploy after adding/changing the variable

3. **Check which environments the variable is set for:**
   - Make sure it's set for **Production** (and Preview if you want it there too)

4. **Alternative: Use a different approach**
   - If environment variables aren't working, we can use a different method
   - Contact support or modify the code to use a different detection method

## Reverting to Full App

To show the full app again:
- Either remove the `VITE_CRM_ONLY` variable from Vercel, OR
- Set its value to `false` or anything other than `true`
- Trigger a new deployment

