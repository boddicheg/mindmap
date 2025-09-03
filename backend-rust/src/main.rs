use axum::{
    routing::{get, post, put, delete},
    Router, Server,
    http::StatusCode,
    response::{Html, IntoResponse, Json},
    extract::{State, Path},
    middleware,
};
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
};
use std::net::SocketAddr;
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions, FromRow};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use chrono::{Utc, Duration};
use bcrypt;
use anyhow::Result;

// Models
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
struct User {
    id: i64,
    username: String,
    email: String,
    password_hash: String,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct UserResponse {
    id: i64,
    username: String,
    email: String,
    created_at: String,
}

#[derive(Debug, Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
struct AuthResponse {
    message: String,
    token: String,
    user: UserResponse,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
}

// Project models
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
struct Project {
    id: i64,
    name: String,
    description: Option<String>,
    is_private: bool,
    user_id: i64,
    created_at: String,
}

#[derive(Debug, Serialize)]
struct ProjectResponse {
    id: i64,
    name: String,
    description: Option<String>,
    is_private: bool,
    user_id: i64,
    created_at: String,
    tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
struct Tag {
    id: i64,
    name: String,
    project_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
struct ProjectFlow {
    id: i64,
    project_id: i64,
    flow: String,
    last_updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
struct NodeImage {
    id: i64,
    user_id: i64,
    node_id: String,
    image_data: String,
    created_at: String,
    updated_at: String,
}

// Request DTOs
#[derive(Debug, Deserialize)]
struct CreateProjectRequest {
    name: String,
    description: Option<String>,
    is_private: Option<bool>,
    tags: Option<String>, // Comma-separated tags
}

#[derive(Debug, Deserialize)]
struct UpdateProjectRequest {
    name: Option<String>,
    description: Option<String>,
    is_private: Option<bool>,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct UpdateEmailRequest {
    email: String,
}

#[derive(Debug, Deserialize)]
struct SaveFlowRequest {
    flow: String,
}

#[derive(Debug, Deserialize)]
struct UploadImageRequest {
    #[serde(rename = "nodeId")]
    node_id: String,
    #[serde(rename = "imageData")]
    image_data: String,
}

#[derive(Debug, Serialize)]
struct ApiResponse<T> {
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    exp: i64,
    iat: i64,
}

// Database setup
async fn init_db() -> Result<SqlitePool> {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:db.sqlite".to_string());

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // Create tables
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(64) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash VARCHAR(256) NOT NULL,
            created_at TEXT NOT NULL
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(500),
            is_private BOOLEAN DEFAULT FALSE,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50) NOT NULL,
            project_id INTEGER NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS project_flows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            flow TEXT NOT NULL,
            last_updated TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )
    "#).execute(&pool).await?;

    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS node_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            node_id VARCHAR(100) NOT NULL,
            image_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    "#).execute(&pool).await?;

    Ok(pool)
}

// JWT utilities
fn generate_token(user_id: i64) -> Result<String> {
    let secret = std::env::var("SECRET_KEY").unwrap_or_else(|_| "dev_secret_key".to_string());
    let now = Utc::now();
    let exp = (now + Duration::days(1)).timestamp();
    
    let claims = Claims {
        sub: user_id.to_string(),
        exp,
        iat: now.timestamp(),
    };

    let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))?;
    Ok(token)
}

fn verify_token(token: &str) -> Result<Claims> {
    let secret = std::env::var("SECRET_KEY").unwrap_or_else(|_| "dev_secret_key".to_string());
    let validation = Validation::default();
    let token_data = decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &validation)?;
    Ok(token_data.claims)
}

// Auth middleware
async fn auth_middleware<B>(
    State(pool): State<SqlitePool>,
    mut req: axum::http::Request<B>,
    next: middleware::Next<B>,
) -> Result<axum::response::Response, StatusCode> {
    let auth_header = req
        .headers()
        .get("authorization")
        .and_then(|header| header.to_str().ok());

    let token = if let Some(auth_header) = auth_header {
        if auth_header.starts_with("Bearer ") {
            &auth_header[7..]
        } else {
            return Err(StatusCode::UNAUTHORIZED);
        }
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let claims = match verify_token(token) {
        Ok(claims) => claims,
        Err(_) => return Err(StatusCode::UNAUTHORIZED),
    };

    let user_id: i64 = match claims.sub.parse() {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::UNAUTHORIZED),
    };

    // Get user from database
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match user {
        Some(user) => {
            req.extensions_mut().insert(user);
            Ok(next.run(req).await)
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

// Handlers
async fn register(
    State(pool): State<SqlitePool>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Validate input
    if payload.username.trim().is_empty() || payload.email.trim().is_empty() || payload.password.len() < 6 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid input".to_string(),
            }),
        ));
    }

    // Check if user exists
    let existing: Option<User> = sqlx::query_as("SELECT * FROM users WHERE username = ? OR email = ?")
        .bind(&payload.username)
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if existing.is_some() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Username or email already exists".to_string(),
            }),
        ));
    }

    // Hash password
    let password_hash = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Hash error".to_string() })))?;

    // Create user
    let created_at = Utc::now().to_rfc3339();
    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?) RETURNING *"
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(&created_at)
    .fetch_one(&pool)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Create user error".to_string() })))?;

    // Generate token
    let token = generate_token(user.id)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Token error".to_string() })))?;

    Ok(Json(AuthResponse {
        message: "User registered successfully".to_string(),
        token,
        user: UserResponse {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
        },
    }))
}

async fn login(
    State(pool): State<SqlitePool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Get user
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE email = ?")
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    let user = user.ok_or_else(|| (
        StatusCode::UNAUTHORIZED,
        Json(ErrorResponse {
            error: "Invalid email or password".to_string(),
        }),
    ))?;

    // Verify password
    if !bcrypt::verify(&payload.password, &user.password_hash).unwrap_or(false) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Invalid email or password".to_string(),
            }),
        ));
    }

    // Generate token
    let token = generate_token(user.id)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Token error".to_string() })))?;

    Ok(Json(AuthResponse {
        message: "Login successful".to_string(),
        token,
        user: UserResponse {
            id: user.id,
            username: user.username,
            email: user.email,
            created_at: user.created_at,
        },
    }))
}

async fn get_profile(
    axum::Extension(user): axum::Extension<User>,
) -> Json<UserResponse> {
    Json(UserResponse {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
    })
}

async fn update_email(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Json(payload): Json<UpdateEmailRequest>,
) -> Result<Json<ApiResponse<UserResponse>>, (StatusCode, Json<ErrorResponse>)> {
    if payload.email.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Email is required".to_string(),
            }),
        ));
    }

    // Check if email already exists for another user
    let existing: Option<User> = sqlx::query_as("SELECT * FROM users WHERE email = ? AND id != ?")
        .bind(&payload.email)
        .bind(user.id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if existing.is_some() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Email already in use by another account".to_string(),
            }),
        ));
    }

    // Update email
    sqlx::query("UPDATE users SET email = ? WHERE id = ?")
        .bind(&payload.email)
        .bind(user.id)
        .execute(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    // Get updated user
    let updated_user: User = sqlx::query_as("SELECT * FROM users WHERE id = ?")
        .bind(user.id)
        .fetch_one(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    Ok(Json(ApiResponse {
        message: "Email updated successfully".to_string(),
        data: Some(UserResponse {
            id: updated_user.id,
            username: updated_user.username,
            email: updated_user.email,
            created_at: updated_user.created_at,
        }),
    }))
}

async fn delete_account(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ErrorResponse>)> {
    sqlx::query("DELETE FROM users WHERE id = ?")
        .bind(user.id)
        .execute(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    Ok(Json(ApiResponse {
        message: "Account deleted successfully".to_string(),
        data: None,
    }))
}

// Project handlers
async fn get_projects(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
) -> Result<Json<Vec<ProjectResponse>>, (StatusCode, Json<ErrorResponse>)> {
    let projects: Vec<Project> = sqlx::query_as("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC")
        .bind(user.id)
        .fetch_all(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    let mut project_responses = Vec::new();
    for project in projects {
        let tags: Vec<String> = sqlx::query_scalar("SELECT name FROM tags WHERE project_id = ?")
            .bind(project.id)
            .fetch_all(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

        project_responses.push(ProjectResponse {
            id: project.id,
            name: project.name,
            description: project.description,
            is_private: project.is_private,
            user_id: project.user_id,
            created_at: project.created_at,
            tags,
        });
    }

    Ok(Json(project_responses))
}

async fn create_project(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Json(payload): Json<CreateProjectRequest>,
) -> Result<Json<ProjectResponse>, (StatusCode, Json<ErrorResponse>)> {
    if payload.name.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Project name is required".to_string(),
            }),
        ));
    }

    let created_at = Utc::now().to_rfc3339();
    let project: Project = sqlx::query_as(
        "INSERT INTO projects (name, description, is_private, user_id, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *"
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(payload.is_private.unwrap_or(false))
    .bind(user.id)
    .bind(&created_at)
    .fetch_one(&pool)
    .await
    .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    // Process tags
    let mut tags = Vec::new();
    if let Some(tags_str) = payload.tags {
        let tag_names: Vec<&str> = tags_str.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).take(5).collect();
        for tag_name in tag_names {
            sqlx::query("INSERT INTO tags (name, project_id) VALUES (?, ?)")
                .bind(tag_name)
                .bind(project.id)
                .execute(&pool)
                .await
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
            tags.push(tag_name.to_string());
        }
    }

    Ok(Json(ProjectResponse {
        id: project.id,
        name: project.name,
        description: project.description,
        is_private: project.is_private,
        user_id: project.user_id,
        created_at: project.created_at,
        tags,
    }))
}

async fn get_project(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Path(project_id): Path<i64>,
) -> Result<Json<ProjectResponse>, (StatusCode, Json<ErrorResponse>)> {
    let project: Option<Project> = sqlx::query_as("SELECT * FROM projects WHERE id = ? AND user_id = ?")
        .bind(project_id)
        .bind(user.id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    let project = project.ok_or_else(|| (
        StatusCode::NOT_FOUND,
        Json(ErrorResponse {
            error: "Project not found".to_string(),
        }),
    ))?;

    let tags: Vec<String> = sqlx::query_scalar("SELECT name FROM tags WHERE project_id = ?")
        .bind(project.id)
        .fetch_all(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    Ok(Json(ProjectResponse {
        id: project.id,
        name: project.name,
        description: project.description,
        is_private: project.is_private,
        user_id: project.user_id,
        created_at: project.created_at,
        tags,
    }))
}

async fn update_project(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Path(project_id): Path<i64>,
    Json(payload): Json<UpdateProjectRequest>,
) -> Result<Json<ProjectResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Check if project exists and belongs to user
    let project_exists: Option<Project> = sqlx::query_as("SELECT * FROM projects WHERE id = ? AND user_id = ?")
        .bind(project_id)
        .bind(user.id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if project_exists.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Project not found".to_string(),
            }),
        ));
    }

    // Update project fields
    if let Some(name) = &payload.name {
        sqlx::query("UPDATE projects SET name = ? WHERE id = ?")
            .bind(name)
            .bind(project_id)
            .execute(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
    }

    if let Some(description) = &payload.description {
        sqlx::query("UPDATE projects SET description = ? WHERE id = ?")
            .bind(description)
            .bind(project_id)
            .execute(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
    }

    if let Some(is_private) = payload.is_private {
        sqlx::query("UPDATE projects SET is_private = ? WHERE id = ?")
            .bind(is_private)
            .bind(project_id)
            .execute(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
    }

    // Update tags if provided
    if let Some(tags) = payload.tags {
        // Delete existing tags
        sqlx::query("DELETE FROM tags WHERE project_id = ?")
            .bind(project_id)
            .execute(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

        // Add new tags (limit to 5)
        for tag_name in tags.into_iter().take(5) {
            sqlx::query("INSERT INTO tags (name, project_id) VALUES (?, ?)")
                .bind(&tag_name)
                .bind(project_id)
                .execute(&pool)
                .await
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
        }
    }

    // Return updated project
    get_project(State(pool), axum::Extension(user), Path(project_id)).await
}

async fn delete_project(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Path(project_id): Path<i64>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ErrorResponse>)> {
    let result = sqlx::query("DELETE FROM projects WHERE id = ? AND user_id = ?")
        .bind(project_id)
        .bind(user.id)
        .execute(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if result.rows_affected() == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Project not found".to_string(),
            }),
        ));
    }

    Ok(Json(ApiResponse {
        message: "Project deleted successfully".to_string(),
        data: None,
    }))
}

// Flow handlers
async fn get_project_flow(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Path(project_id): Path<i64>,
) -> Result<Json<Option<ProjectFlow>>, (StatusCode, Json<ErrorResponse>)> {
    // Check if project exists and belongs to user
    let project_exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects WHERE id = ? AND user_id = ?")
        .bind(project_id)
        .bind(user.id)
        .fetch_one(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if project_exists == 0 {
        return Ok(Json(None));
    }

    let flow: Option<ProjectFlow> = sqlx::query_as("SELECT * FROM project_flows WHERE project_id = ?")
        .bind(project_id)
        .fetch_optional(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    Ok(Json(flow))
}

async fn save_project_flow(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Path(project_id): Path<i64>,
    Json(payload): Json<SaveFlowRequest>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ErrorResponse>)> {
    // Check if project exists and belongs to user
    let project_exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM projects WHERE id = ? AND user_id = ?")
        .bind(project_id)
        .bind(user.id)
        .fetch_one(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if project_exists == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: "Project not found or access denied".to_string(),
            }),
        ));
    }

    let last_updated = Utc::now().to_rfc3339();

    // Try to update existing flow first
    let result = sqlx::query("UPDATE project_flows SET flow = ?, last_updated = ? WHERE project_id = ?")
        .bind(&payload.flow)
        .bind(&last_updated)
        .bind(project_id)
        .execute(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if result.rows_affected() == 0 {
        // Create new flow if none exists
        sqlx::query("INSERT INTO project_flows (project_id, flow, last_updated) VALUES (?, ?, ?)")
            .bind(project_id)
            .bind(&payload.flow)
            .bind(&last_updated)
            .execute(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
    }

    Ok(Json(ApiResponse {
        message: "Flow saved successfully".to_string(),
        data: None,
    }))
}

// Image upload handler
async fn upload_image(
    State(pool): State<SqlitePool>,
    axum::Extension(user): axum::Extension<User>,
    Json(payload): Json<UploadImageRequest>,
) -> Result<Json<ApiResponse<String>>, (StatusCode, Json<ErrorResponse>)> {
    if payload.node_id.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "nodeId is required".to_string(),
            }),
        ));
    }

    if payload.image_data.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "imageData is required".to_string(),
            }),
        ));
    }

    if !payload.image_data.starts_with("data:image/") {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Invalid image data format".to_string(),
            }),
        ));
    }

    let now = Utc::now().to_rfc3339();

    // Try to update existing image first
    let result = sqlx::query("UPDATE node_images SET image_data = ?, updated_at = ? WHERE user_id = ? AND node_id = ?")
        .bind(&payload.image_data)
        .bind(&now)
        .bind(user.id)
        .bind(&payload.node_id)
        .execute(&pool)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;

    if result.rows_affected() == 0 {
        // Create new image if none exists
        sqlx::query("INSERT INTO node_images (user_id, node_id, image_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
            .bind(user.id)
            .bind(&payload.node_id)
            .bind(&payload.image_data)
            .bind(&now)
            .bind(&now)
            .execute(&pool)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { error: "Database error".to_string() })))?;
    }

    Ok(Json(ApiResponse {
        message: "Image uploaded successfully".to_string(),
        data: Some(payload.image_data),
    }))
}

// Serve SPA
async fn serve_spa() -> impl IntoResponse {
    // if path.starts_with("api") {
    //     return (StatusCode::NOT_FOUND, "API endpoint not found").into_response();
    // }
    
    match tokio::fs::read_to_string("../app/dist/index.html").await {
        Ok(content) => Html(content).into_response(),
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Could not read index.html").into_response(),
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let pool = init_db().await?;

    // Protected routes
    let protected_routes = Router::new()
        .route("/api/user/profile", get(get_profile))
        .route("/api/user/update-email", put(update_email))
        .route("/api/user/delete-account", delete(delete_account))
        .route("/api/projects", get(get_projects))
        .route("/api/projects", post(create_project))
        .route("/api/projects/:id", get(get_project))
        .route("/api/projects/:id", put(update_project))
        .route("/api/projects/:id", delete(delete_project))
        .route("/api/projects/:id/flow", get(get_project_flow))
        .route("/api/projects/:id/flow", post(save_project_flow))
        .route("/api/upload-image", post(upload_image))
        .layer(middleware::from_fn_with_state(pool.clone(), auth_middleware));

    let app = Router::new()
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/", get(serve_spa))
        .merge(protected_routes)
        .nest_service("/assets", ServeDir::new("../app/dist/assets"))
        .fallback(get(serve_spa))
        .with_state(pool)
        .layer(
            ServiceBuilder::new()
                .layer(
                    CorsLayer::new()
                        .allow_origin(Any)
                        .allow_methods(Any)
                        .allow_headers(Any)
                )
        );

    let addr = SocketAddr::from(([127, 0, 0, 1], 1337));
    println!("🦀 Rust server starting on http://{}", addr);
    
    Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}
