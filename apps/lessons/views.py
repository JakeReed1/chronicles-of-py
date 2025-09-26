from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import ListView, DetailView, View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
from django.contrib import messages
import json

from .models import Lesson, Challenge, PlayerLessonProgress, Hint
from apps.characters.models import Player, ConceptMastery
from apps.core.models import PythonConcept
from apps.core.game_engine import GameEngine


class LessonListView(LoginRequiredMixin, ListView):
    """Display all available lessons"""
    model = Lesson
    template_name = 'lessons/lesson_list.html'
    context_object_name = 'lessons'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Get player's progress on all lessons
        player = self.request.user.player
        progress = PlayerLessonProgress.objects.filter(player=player)
        progress_dict = {p.lesson_id: p for p in progress}
        
        # Add progress info to each lesson
        for lesson in context['lessons']:
            lesson.player_progress = progress_dict.get(lesson.id)
            
        return context


class LessonDetailView(LoginRequiredMixin, DetailView):
    """Display a specific lesson with its content and challenges"""
    model = Lesson
    template_name = 'lessons/lesson_detail.html'
    context_object_name = 'lesson'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        player = self.request.user.player
        
        # Get or create progress for this lesson
        progress, created = PlayerLessonProgress.objects.get_or_create(
            player=player,
            lesson=self.object,
            defaults={'is_unlocked': True}
        )
        
        context['progress'] = progress
        context['challenges'] = self.object.challenges.all().order_by('order')
        
        return context


class ChallengeView(LoginRequiredMixin, DetailView):
    """Display a specific challenge for the player to solve"""
    model = Challenge
    template_name = 'lessons/challenge.html'
    context_object_name = 'challenge'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        player = self.request.user.player
        
        # Check if player has access to this challenge
        progress = PlayerLessonProgress.objects.filter(
            player=player,
            lesson=self.object.lesson
        ).first()
        
        if not progress or not progress.is_unlocked:
            messages.error(self.request, "You haven't unlocked this lesson yet!")
            return redirect('lessons:list')
            
        # Get hints for this challenge
        context['hints'] = self.object.hints.all().order_by('order')
        
        # Check if player has completed this challenge
        completed_challenges = json.loads(progress.completed_challenges or '[]')
        context['is_completed'] = self.object.id in completed_challenges
        
        return context


class SubmitSolutionView(LoginRequiredMixin, View):
    """Handle solution submission for a challenge"""
    
    def post(self, request, challenge_id):
        challenge = get_object_or_404(Challenge, id=challenge_id)
        player = request.user.player
        
        try:
            data = json.loads(request.body)
            submitted_code = data.get('code', '')
            
            # Use GameEngine to test the code safely
            engine = GameEngine()
            
            # Execute the submitted code
            try:
                result = engine.execute_player_code(submitted_code, {})
                
                # Check if the solution is correct
                is_correct = self._check_solution(challenge, submitted_code, result)
                
                if is_correct:
                    # Update player progress
                    progress = PlayerLessonProgress.objects.get(
                        player=player,
                        lesson=challenge.lesson
                    )
                    
                    completed = json.loads(progress.completed_challenges or '[]')
                    if challenge.id not in completed:
                        completed.append(challenge.id)
                        progress.completed_challenges = json.dumps(completed)
                        progress.save()
                    
                    # Award experience
                    player.add_experience(challenge.experience_reward)
                    
                    # Update concept mastery
                    if challenge.lesson.concept:
                        mastery, created = ConceptMastery.objects.get_or_create(
                            player=player,
                            concept=challenge.lesson.concept,
                            defaults={'mastery_level': 0}
                        )
                        mastery.add_experience(10)  # Award mastery XP
                    
                    return JsonResponse({
                        'success': True,
                        'message': 'Correct! Well done!',
                        'experience_gained': challenge.experience_reward
                    })
                else:
                    return JsonResponse({
                        'success': False,
                        'message': 'Not quite right. Try again!',
                        'hint': self._get_hint(challenge, data.get('attempts', 0))
                    })
                    
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'message': f'Error in your code: {str(e)}',
                    'error': str(e)
                })
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'message': 'An error occurred',
                'error': str(e)
            }, status=500)
    
    def _check_solution(self, challenge, code, result):
        """Check if the submitted solution is correct"""
        # For now, use simple string matching on the expected output
        # In the future, this could be more sophisticated
        
        if challenge.expected_output:
            expected = json.loads(challenge.expected_output)
            
            # Check if the result matches expected output
            if isinstance(expected, dict):
                return all(
                    result.get(key) == value 
                    for key, value in expected.items()
                )
            else:
                return str(result) == str(expected)
                
        # If no expected output, just check that code runs without errors
        return True
    
    def _get_hint(self, challenge, attempt_number):
        """Get an appropriate hint based on the number of attempts"""
        hints = challenge.hints.all().order_by('order')
        
        if hints and attempt_number < len(hints):
            return hints[attempt_number].content
            
        return None
