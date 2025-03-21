from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email
from werkzeug.security import generate_password_hash, check_password_hash

# Simple user class - in production, you'd use a database
class User(UserMixin):
    def __init__(self, id, email, password_hash, name, role):
        self.id = id
        self.email = email
        self.password_hash = password_hash
        self.name = name
        self.role = role
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def is_admin(self):
        return self.role == 'admin'

# Login form
class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

# Mock user database - replace with actual database in production
users = {
    '1': User(
        id='1', 
        email='admin@example.com',
        password_hash=generate_password_hash('admin123'),
        name='Admin User',
        role='admin'
    ),
    '2': User(
        id='2', 
        email='user@example.com',
        password_hash=generate_password_hash('user123'),
        name='Regular User',
        role='user'
    )
}

# Function to find a user by email
def get_user_by_email(email):
    for user in users.values():
        if user.email == email:
            return user
    return None

# Setup LoginManager
def init_login_manager(app):
    login_manager = LoginManager()
    login_manager.login_view = 'login'
    login_manager.init_app(app)
    
    @login_manager.user_loader
    def load_user(user_id):
        return users.get(user_id)
    
    return login_manager