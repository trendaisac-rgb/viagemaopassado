
CREATE OR REPLACE FUNCTION public.seed_demo_for_user(_uid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  ep_ids uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  titles text[] := ARRAY[
    'A última carta de Napoleão antes de Santa Helena',
    'O segredo do diário perdido de Da Vinci',
    'A noite em que Roma quase caiu sem batalha',
    'A mensagem cifrada que mudou a Segunda Guerra',
    'O imperador que recusou um trono — duas vezes'
  ];
  angles text[] := ARRAY[
    'O que ninguém te contou sobre o exílio de Napoleão',
    'Da Vinci esconde uma equação no caderno de 1503',
    'A traição dentro do Senado que ninguém anotou',
    'Como um único operador de rádio virou o jogo',
    'A renúncia que assustou três continentes'
  ];
  nets network_kind[] := ARRAY['x','youtube','instagram','tiktok'];
  i int;
  d int;
  n network_kind;
BEGIN
  -- Episodes
  FOR i IN 1..5 LOOP
    INSERT INTO public.episodes (id, user_id, title, topic, angle, script, caption, hashtags, status, duration_s, progress_pct, progress_step, created_at)
    VALUES (
      ep_ids[i], _uid, titles[i],
      titles[i],
      angles[i],
      'Você sabia disso? [CORTE] ' || angles[i] || '. [CORTE] Tudo começou quando... [CORTE] E o desfecho? Bem mais surpreendente do que você imagina.',
      angles[i] || ' — salva pra contar pra alguém hoje.',
      ARRAY['#historia','#viagemaopassado','#curiosidades','#cultura','#shorts','#fatos'],
      CASE WHEN i <= 3 THEN 'published'::episode_status WHEN i = 4 THEN 'ready'::episode_status ELSE 'draft'::episode_status END,
      40 + (i*3),
      CASE WHEN i <= 4 THEN 100 ELSE 0 END,
      CASE WHEN i <= 4 THEN 'pronto' ELSE NULL END,
      now() - (i || ' days')::interval
    );
  END LOOP;

  -- Metrics: 30 days, distributed
  FOR d IN 0..29 LOOP
    FOREACH n IN ARRAY nets LOOP
      INSERT INTO public.metrics (user_id, episode_id, network, date, views, likes, comments, shares, retention_pct, followers)
      VALUES (
        _uid,
        ep_ids[1 + (d % 5)],
        n,
        (current_date - d),
        (300 + (random()*8000)::int + d*40),
        (10 + (random()*400)::int),
        (random()*60)::int,
        (random()*120)::int,
        round((45 + random()*40)::numeric, 2),
        (8000 + d*120 + (random()*500)::int)
      );
    END LOOP;
  END LOOP;

  -- Scheduled posts (future)
  INSERT INTO public.scheduled_posts (user_id, episode_id, network, scheduled_at, status) VALUES
    (_uid, ep_ids[4], 'youtube',   now() + interval '6 hours',  'scheduled'),
    (_uid, ep_ids[4], 'instagram', now() + interval '8 hours',  'scheduled'),
    (_uid, ep_ids[4], 'tiktok',    now() + interval '1 day',    'scheduled'),
    (_uid, ep_ids[5], 'x',         now() + interval '2 days',   'scheduled'),
    (_uid, ep_ids[5], 'youtube',   now() + interval '3 days',   'scheduled');

  -- Past published posts
  INSERT INTO public.scheduled_posts (user_id, episode_id, network, scheduled_at, status) VALUES
    (_uid, ep_ids[1], 'youtube',   now() - interval '5 days',  'published'),
    (_uid, ep_ids[1], 'instagram', now() - interval '5 days',  'published'),
    (_uid, ep_ids[2], 'tiktok',    now() - interval '3 days',  'published'),
    (_uid, ep_ids[3], 'x',         now() - interval '2 days',  'published');

  -- Networks
  INSERT INTO public.networks (user_id, network, handle, status, connected_at) VALUES
    (_uid, 'youtube',   '@viagemaopassado', 'connected',    now() - interval '20 days'),
    (_uid, 'instagram', '@viagemaopassado', 'connected',    now() - interval '15 days'),
    (_uid, 'tiktok',    '@viagemaopassado', 'pending',      NULL),
    (_uid, 'x',         '@viagemaopassado', 'disconnected', NULL);

  -- Comments
  INSERT INTO public.comments (user_id, episode_id, network, author, body, sentiment, replied, post_url) VALUES
    (_uid, ep_ids[1], 'youtube',   'Marina S.', 'Não fazia ideia disso, conta mais!', 'pos', false, 'https://youtube.com'),
    (_uid, ep_ids[1], 'instagram', 'jorge_h',   'Fonte? quero ler mais', 'neu', false, 'https://instagram.com'),
    (_uid, ep_ids[2], 'tiktok',    'rafa.k',    'Genial, melhor canal!', 'pos', true,  'https://tiktok.com'),
    (_uid, ep_ids[3], 'x',         '@cleo',     'Discordo dessa interpretação', 'neg', false, 'https://x.com'),
    (_uid, ep_ids[2], 'youtube',   'Ana C.',    'Senti falta de mais contexto', 'neu', false, 'https://youtube.com'),
    (_uid, ep_ids[1], 'tiktok',    'pedrofx',   'Achei sensacional!!', 'pos', false, 'https://tiktok.com');
END; $$;

REVOKE EXECUTE ON FUNCTION public.seed_demo_for_user(uuid) FROM PUBLIC, anon, authenticated;

-- Hook into handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  PERFORM public.seed_demo_for_user(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $$;
