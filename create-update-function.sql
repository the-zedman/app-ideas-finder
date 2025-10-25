-- Create a SQL function to update avatar_url
CREATE OR REPLACE FUNCTION update_avatar_url(user_id uuid, avatar_url text)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles 
  SET avatar_url = $2, updated_at = NOW()
  WHERE id = $1;
  
  RETURN json_build_object(
    'success', true,
    'rows_affected', ROW_COUNT()
  );
END;
$$;
