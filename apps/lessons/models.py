from django.db import models
from django.contrib.auth.models import User
from apps.core.models import TimestampedModel, PythonConcept


class LessonCategory(models.Model):
    """Categories for organizing lessons"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    order = models.IntegerField(default=0)
    icon = models.CharField(max_length=100, blank=True)
    
    class Meta:
        verbose_name_plural = 'Lesson Categories'
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name


class Lesson(TimestampedModel):
    """Educational lessons teaching Python concepts"""
    category = models.ForeignKey(LessonCategory, on_delete=models.CASCADE, related_name='lessons')
    concept = models.ForeignKey(PythonConcept, on_delete=models.CASCADE, related_name='lessons')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    order = models.IntegerField(default=0)
    
    # Content
    introduction = models.TextField()
    content_sections = models.JSONField(default=list)  # List of {title, content, code_example}
    
    # Code examples
    example_code = models.TextField()
    starter_code = models.TextField(
        blank=True,
        help_text="Code template for students to start with"
    )
    solution_code = models.TextField(
        blank=True,
        help_text="Solution code (hidden from students)"
    )
    
    # Requirements
    prerequisite_lessons = models.ManyToManyField(
        'self',
        blank=True,
        symmetrical=False,
        related_name='unlocks_lessons'
    )
    required_level = models.IntegerField(default=1)
    
    # Rewards
    experience_reward = models.IntegerField(default=50)
    unlocks_skills = models.ManyToManyField('battles.Skill', blank=True)
    unlocks_items = models.ManyToManyField('core.GameItem', blank=True)
    
    class Meta:
        ordering = ['category', 'order', 'title']
    
    def __str__(self):
        return f"{self.title} ({self.concept.name})"


class Challenge(TimestampedModel):
    """Coding challenges within lessons"""
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='challenges')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.IntegerField(default=1)  # 1-5 stars
    
    # Challenge specifics
    problem_statement = models.TextField()
    starter_code = models.TextField()
    
    # Test cases
    test_cases = models.JSONField(
        default=list,
        help_text="List of {input, expected_output, description}"
    )
    hidden_test_cases = models.JSONField(
        default=list,
        help_text="Additional test cases not shown to player"
    )
    
    # Validation
    required_concepts = models.ManyToManyField(PythonConcept, blank=True)
    forbidden_concepts = models.ManyToManyField(
        PythonConcept,
        blank=True,
        related_name='forbidden_in_challenges'
    )
    
    # Hints system
    hints = models.JSONField(
        default=list,
        help_text="List of hints revealed progressively"
    )
    
    # Rewards
    experience_reward = models.IntegerField(default=25)
    gold_reward = models.IntegerField(default=10)
    
    class Meta:
        ordering = ['lesson', 'difficulty', 'title']
    
    def __str__(self):
        return f"{self.title} (★{self.difficulty})"


class PlayerLessonProgress(TimestampedModel):
    """Track player progress through lessons"""
    player = models.ForeignKey('characters.Player', on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    
    # Progress tracking
    is_completed = models.BooleanField(default=False)
    completion_date = models.DateTimeField(null=True, blank=True)
    time_spent = models.IntegerField(default=0)  # Seconds
    
    # Performance
    score = models.IntegerField(default=0)  # 0-100
    attempts = models.IntegerField(default=0)
    
    # Section progress
    completed_sections = models.JSONField(default=list)
    current_section = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['player', 'lesson']
        verbose_name = 'Player Lesson Progress'
        verbose_name_plural = 'Player Lesson Progress'
    
    def __str__(self):
        return f"{self.player.name} - {self.lesson.title} ({self.score}%)"


class PlayerChallengeAttempt(TimestampedModel):
    """Record of player attempts at challenges"""
    player = models.ForeignKey('characters.Player', on_delete=models.CASCADE)
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE)
    
    # Submission
    submitted_code = models.TextField()
    submission_time = models.DateTimeField(auto_now_add=True)
    
    # Results
    passed = models.BooleanField(default=False)
    test_results = models.JSONField(default=dict)
    execution_time = models.FloatField(default=0)  # Seconds
    
    # Feedback
    error_message = models.TextField(blank=True)
    hints_used = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-submission_time']
    
    def __str__(self):
        status = "✓" if self.passed else "✗"
        return f"{self.player.name} - {self.challenge.title} {status}"


class Hint(models.Model):
    """Hints that can be given to players"""
    content = models.TextField()
    
    # Context
    concept = models.ForeignKey(
        PythonConcept,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # Cost
    gold_cost = models.IntegerField(default=5)
    
    def __str__(self):
        context = self.concept or self.lesson or "General"
        return f"Hint for {context}"


class CodeSnippet(models.Model):
    """Reusable code snippets for lessons"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    code = models.TextField()
    language = models.CharField(max_length=20, default='python')
    
    # Categorization
    concepts = models.ManyToManyField(PythonConcept, blank=True)
    tags = models.JSONField(default=list)
    
    def __str__(self):
        return self.name
