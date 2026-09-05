

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "analytics";


ALTER SCHEMA "analytics" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "analytics"."housekeeping"() RETURNS "void"
    LANGUAGE "sql"
    AS $$
  delete from analytics.events           where ts < now() - interval '24 months';
  delete from analytics.visitor_salts    where day < current_date - 2;
  delete from analytics.identified_users where last_seen < now() - interval '90 days';
  delete from analytics.ingest_log       where ts < now() - interval '30 days';
  delete from analytics.events e
    using public.websites w
    where e.site_id = w.id and w.deleted_at is not null
      and e.id in (select id from analytics.events where site_id = w.id limit 50000);
  delete from public.websites w
    where w.deleted_at is not null
      and not exists (select 1 from analytics.events where site_id = w.id);
$$;


ALTER FUNCTION "analytics"."housekeeping"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."normalise_hostname"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  select case when h ~ '^[a-z0-9.-]+$' then h end from (select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          split_part(
            regexp_replace(
              regexp_replace(lower(trim(input)), '^[a-z][a-z0-9+.-]*://', ''),
              '^[^@]*@', ''),
            '/', 1),
          ':[0-9]+$', ''),
        '\.+$', ''),
      '^www\.', ''),
    '') as h) n
$_$;


ALTER FUNCTION "analytics"."normalise_hostname"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "analytics"."seed_hostnames"() RETURNS integer
    LANGUAGE "sql"
    AS $$
  with rows as (
    insert into analytics.site_hostnames (site_id, hostname)
    select id, analytics.normalise_hostname(url)
    from public.websites
    where analytics.normalise_hostname(url) is not null
    on conflict do nothing
    returning 1
  )
  select count(*)::int from rows
$$;


ALTER FUNCTION "analytics"."seed_hostnames"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "analytics"."events" (
    "id" bigint NOT NULL,
    "site_id" bigint NOT NULL,
    "ts" timestamp with time zone NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "seq" integer DEFAULT 0 NOT NULL,
    "event" "text" NOT NULL,
    "name" "text" DEFAULT ''::"text" NOT NULL,
    "visitor_id" bigint NOT NULL,
    "session_id" bigint NOT NULL,
    "user_hash" bigint DEFAULT 0 NOT NULL,
    "pageview_id" bigint NOT NULL,
    "hostname" "text" NOT NULL,
    "path" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "query" "text" DEFAULT ''::"text" NOT NULL,
    "referrer" "text" DEFAULT ''::"text" NOT NULL,
    "referrer_url" "text" DEFAULT ''::"text" NOT NULL,
    "source" "text" DEFAULT ''::"text" NOT NULL,
    "channel" "text" DEFAULT ''::"text" NOT NULL,
    "utm_source" "text" DEFAULT ''::"text" NOT NULL,
    "utm_medium" "text" DEFAULT ''::"text" NOT NULL,
    "utm_campaign" "text" DEFAULT ''::"text" NOT NULL,
    "utm_term" "text" DEFAULT ''::"text" NOT NULL,
    "utm_content" "text" DEFAULT ''::"text" NOT NULL,
    "country" "text" DEFAULT ''::"text" NOT NULL,
    "region" "text" DEFAULT ''::"text" NOT NULL,
    "city" "text" DEFAULT ''::"text" NOT NULL,
    "device" "text" DEFAULT ''::"text" NOT NULL,
    "browser" "text" DEFAULT ''::"text" NOT NULL,
    "browser_major" smallint DEFAULT 0 NOT NULL,
    "browser_version" "text" DEFAULT ''::"text" NOT NULL,
    "os" "text" DEFAULT ''::"text" NOT NULL,
    "os_version" "text" DEFAULT ''::"text" NOT NULL,
    "screen_width" smallint DEFAULT 0 NOT NULL,
    "screen_height" smallint DEFAULT 0 NOT NULL,
    "language" "text" DEFAULT ''::"text" NOT NULL,
    "engaged_ms" integer DEFAULT 0 NOT NULL,
    "scroll_depth" smallint DEFAULT 0 NOT NULL,
    "props" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "revenue" numeric,
    "lcp" real,
    "cls" real,
    "inp" real,
    "fcp" real,
    "ttfb" real,
    "dcl" real,
    "load" real,
    "tti" real,
    "tbt" real,
    "resources" smallint,
    "lcp_target" "text",
    "inp_target" "text",
    "suspect" boolean DEFAULT false NOT NULL,
    "ingest_version" smallint NOT NULL,
    "viewport_width" smallint DEFAULT 0 NOT NULL,
    "viewport_height" smallint DEFAULT 0 NOT NULL,
    CONSTRAINT "events_event_check" CHECK (("event" = ANY (ARRAY['pageview'::"text", 'engagement'::"text", 'custom'::"text", 'vitals'::"text", 'identify'::"text"])))
);


ALTER TABLE "analytics"."events" OWNER TO "postgres";


ALTER TABLE "analytics"."events" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "analytics"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "analytics"."identified_users" (
    "site_id" bigint NOT NULL,
    "user_hash" bigint NOT NULL,
    "user_id" "text" NOT NULL,
    "last_seen" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."identified_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."ingest_log" (
    "ts" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hostname" "text" NOT NULL,
    "site_id" bigint,
    "stage" "text" NOT NULL,
    "detail" "text" DEFAULT ''::"text" NOT NULL
);


ALTER TABLE "analytics"."ingest_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."site_hostnames" (
    "site_id" bigint NOT NULL,
    "hostname" "text" NOT NULL
);


ALTER TABLE "analytics"."site_hostnames" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."site_settings" (
    "site_id" bigint NOT NULL,
    "timezone" "text" DEFAULT 'UTC'::"text" NOT NULL,
    "store_titles" boolean DEFAULT false NOT NULL,
    "store_user_ids" boolean DEFAULT false NOT NULL,
    "excluded_ips" "cidr"[] DEFAULT '{}'::"cidr"[] NOT NULL,
    "excluded_paths" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "kpi_goal_id" bigint,
    "retention_months" smallint DEFAULT 24 NOT NULL,
    "breakpoints" smallint[] DEFAULT '{640,1024,1280}'::smallint[] NOT NULL,
    "shortcuts" boolean DEFAULT true NOT NULL
);


ALTER TABLE "analytics"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "analytics"."visitor_salts" (
    "day" "date" NOT NULL,
    "salt" "bytea" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "analytics"."visitor_salts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."goals" (
    "id" bigint NOT NULL,
    "site_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "match" "text" NOT NULL,
    "revenue" boolean DEFAULT false NOT NULL,
    "target" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "goals_kind_check" CHECK (("kind" = ANY (ARRAY['pageview'::"text", 'event'::"text"])))
);


ALTER TABLE "public"."goals" OWNER TO "postgres";


ALTER TABLE "public"."goals" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."goals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."websites" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."websites" OWNER TO "postgres";


ALTER TABLE "public"."websites" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."websites_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "analytics"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "analytics"."identified_users"
    ADD CONSTRAINT "identified_users_pkey" PRIMARY KEY ("site_id", "user_hash");



ALTER TABLE ONLY "analytics"."site_hostnames"
    ADD CONSTRAINT "site_hostnames_hostname_key" UNIQUE ("hostname");



ALTER TABLE ONLY "analytics"."site_hostnames"
    ADD CONSTRAINT "site_hostnames_pkey" PRIMARY KEY ("site_id", "hostname");



ALTER TABLE ONLY "analytics"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("site_id");



ALTER TABLE ONLY "analytics"."visitor_salts"
    ADD CONSTRAINT "visitor_salts_pkey" PRIMARY KEY ("day");



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."websites"
    ADD CONSTRAINT "websites_url_key" UNIQUE ("url");



CREATE INDEX "events_custom_name" ON "analytics"."events" USING "btree" ("site_id", "name", "ts") WHERE ("event" = 'custom'::"text");



CREATE INDEX "events_site_received" ON "analytics"."events" USING "btree" ("site_id", "received_at");



CREATE INDEX "events_site_session" ON "analytics"."events" USING "btree" ("site_id", "visitor_id", "session_id");



CREATE INDEX "events_site_ts" ON "analytics"."events" USING "btree" ("site_id", "ts");



CREATE INDEX "events_site_ts_custom" ON "analytics"."events" USING "btree" ("site_id", "ts") WHERE ("event" = 'custom'::"text");



CREATE INDEX "ingest_log_hostname_ts" ON "analytics"."ingest_log" USING "btree" ("hostname", "ts");



ALTER TABLE ONLY "analytics"."events"
    ADD CONSTRAINT "events_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."identified_users"
    ADD CONSTRAINT "identified_users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."site_hostnames"
    ADD CONSTRAINT "site_hostnames_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "analytics"."site_settings"
    ADD CONSTRAINT "site_settings_kpi_goal_id_fkey" FOREIGN KEY ("kpi_goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "analytics"."site_settings"
    ADD CONSTRAINT "site_settings_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."goals"
    ADD CONSTRAINT "goals_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "public"."websites"("id") ON DELETE CASCADE;



ALTER TABLE "public"."goals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "goals: owner all" ON "public"."goals" TO "authenticated" USING (("site_id" IN ( SELECT "websites"."id"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"())))) WITH CHECK (("site_id" IN ( SELECT "websites"."id"
   FROM "public"."websites"
  WHERE ("websites"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."websites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "websites: owner delete" ON "public"."websites" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "websites: owner insert" ON "public"."websites" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "websites: owner select" ON "public"."websites" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "websites: owner update" ON "public"."websites" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



GRANT USAGE ON SCHEMA "analytics" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "analytics"."events" TO "service_role";



GRANT ALL ON SEQUENCE "analytics"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "analytics"."identified_users" TO "service_role";



GRANT ALL ON TABLE "analytics"."ingest_log" TO "service_role";



GRANT ALL ON TABLE "analytics"."site_hostnames" TO "service_role";



GRANT ALL ON TABLE "analytics"."site_settings" TO "service_role";



GRANT ALL ON TABLE "analytics"."visitor_salts" TO "service_role";



GRANT ALL ON TABLE "public"."goals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."goals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."websites" TO "authenticated";
GRANT ALL ON TABLE "public"."websites" TO "service_role";



GRANT ALL ON SEQUENCE "public"."websites_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."websites_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "analytics" GRANT ALL ON TABLES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






