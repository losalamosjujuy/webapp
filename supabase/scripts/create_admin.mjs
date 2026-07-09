import { createClient } from "@supabase/supabase-js";

const email = process.env.ADMIN_EMAIL || "losalamosjujuy@gmail.com";
const password = process.env.ADMIN_PASSWORD || "Losalamos2026!";
const fullName = process.env.ADMIN_FULL_NAME || "Administrador Los Alamos";

const supabaseUrl = "https://honkspxurkoyskjaxpdd.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbmtzcHh1cmtveXNramF4cGRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzIwMzU4NSwiZXhwIjoyMDk4Nzc5NTg1fQ.6Jk0l-AoTXy2Hu2L_8E4ZGUyb9yjHqMrIvGrzqauED0";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!password) {
  console.error("Falta ADMIN_PASSWORD.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });

  if (listError) {
    throw listError;
  }

  const existingUser = existingUsers.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  let userId = existingUser?.id;

  if (!existingUser) {
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        name: fullName
      }
    });

    if (createError || !createdUser.user) {
      throw createError ?? new Error("No se pudo crear el usuario admin.");
    }

    userId = createdUser.user.id;
  } else {
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        full_name: fullName,
        name: fullName
      }
    });

    if (updateUserError) {
      throw updateUserError;
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      role: "admin",
      full_name: fullName
    },
    {
      onConflict: "id"
    }
  );

  if (profileError) {
    throw profileError;
  }

  console.log(JSON.stringify({ ok: true, email, fullName, role: "admin" }, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exit(1);
});


